import {
  getAllPropertyNames,
  isRuntimeMethod,
  Runtime,
  RuntimeModulesRecord,
} from "@proto-kit/module";
import { inject, injectable } from "tsyringe";
import {
  BeforeTransactionHookArguments,
  ProvableTransactionHook,
  PublicKeyOption,
  StateMap,
} from "@proto-kit/protocol";
import { Field, Provable, PublicKey } from "o1js";
import { noop } from "@proto-kit/common";

import { UInt64 } from "../math/UInt64";
import { Balance, BalancesKey, TokenId } from "../runtime/Balances";

import {
  MethodFeeConfigData,
  RuntimeFeeAnalyzerService,
  RuntimeFeeAnalyzerServiceConfig,
} from "./RuntimeFeeAnalyzerService";

interface Balances {
  transfer: (
    tokenId: TokenId,
    from: PublicKey,
    to: PublicKey,
    amount: Balance
  ) => Promise<void>;

  balances: StateMap<BalancesKey, Balance>;
}

export interface TransactionFeeHookConfig
  extends RuntimeFeeAnalyzerServiceConfig {}

const errors = {
  invalidFeeTreeRoot: () =>
    "Root hash of the provided fee config witness is invalid",

  invalidFeeConfigMethodId: () =>
    "Method id of the provided fee config does not match the executed transaction method id",

  invalidMethod: (method: string) =>
    new Error(`${method} does not exist in the current runtime.`),
};

/**
 * Transaction hook for deducting transaction fees from the sender's balance.
 */
@injectable()
export class TransactionFeeHook extends ProvableTransactionHook<TransactionFeeHookConfig> {
  public constructor(
    // dependency on runtime, since balances are part of runtime logic
    @inject("Runtime") public runtime: Runtime<RuntimeModulesRecord>,
    @inject("Balances") public balances: Balances
  ) {
    super();
  }

  protected persistedFeeAnalyzer: RuntimeFeeAnalyzerService | undefined =
    undefined;

  // check if the fee config is compatible with the current runtime
  // we couldn't resolve this purely on the type level, so we have to do it here
  public verifyConfig() {
    Object.keys(super.config.methods).forEach((combinedMethodName) => {
      const [runtimeModule, runtimeMethod] = combinedMethodName.split(".");
      const resolvedRuntimeModule = this.runtime.resolve(runtimeModule);

      const runtimeMethodExists =
        getAllPropertyNames(resolvedRuntimeModule).includes(runtimeMethod) &&
        isRuntimeMethod(resolvedRuntimeModule, runtimeMethod);

      if (!runtimeMethodExists) {
        throw errors.invalidMethod(combinedMethodName);
      }
    });
  }

  public async start() {
    this.persistedFeeAnalyzer = new RuntimeFeeAnalyzerService(this.runtime);
    this.verifyConfig();
    this.persistedFeeAnalyzer.config = this.config;
    await this.persistedFeeAnalyzer.initializeFeeTree();
  }

  public get config() {
    return super.config;
  }

  public set config(value: TransactionFeeHookConfig) {
    super.config = value;
  }

  public get feeAnalyzer() {
    if (this.persistedFeeAnalyzer === undefined) {
      throw new Error("TransactionFeeHook.start not called by protocol");
    }
    return this.persistedFeeAnalyzer;
  }

  public async transferFee(from: PublicKeyOption, fee: UInt64) {
    await this.balances.transfer(
      new TokenId(this.config.tokenId),
      from.value,
      PublicKey.fromBase58(this.config.feeRecipient),
      Balance.Unsafe.fromField(fee.value)
    );
  }

  public getFee(feeConfig: MethodFeeConfigData) {
    return UInt64.Unsafe.fromField(feeConfig.baseFee.value).add(
      UInt64.Unsafe.fromField(feeConfig.weight.value).mul(
        UInt64.Unsafe.fromField(feeConfig.perWeightUnitFee.value)
      )
    );
  }

  /**
   * Determine the transaction fee for the given transaction, and transfer it
   * from the transaction sender to the fee recipient.
   *
   * @param executionData
   */
  public async beforeTransaction(
    executionData: BeforeTransactionHookArguments
  ): Promise<void> {
    const feeConfig = Provable.witness(MethodFeeConfigData, () =>
      this.feeAnalyzer.getFeeConfig(
        executionData.transaction.methodId.toBigInt()
      )
    );
    const witness = Provable.witness(
      RuntimeFeeAnalyzerService.getWitnessType(),
      () =>
        this.feeAnalyzer.getWitness(
          executionData.transaction.methodId.toBigInt()
        )
    );

    const root = Field(this.feeAnalyzer.getRoot());
    const calculatedRoot = witness.calculateRoot(feeConfig.hash());

    root.assertEquals(calculatedRoot, errors.invalidFeeTreeRoot());
    feeConfig.methodId.assertEquals(
      executionData.transaction.methodId,
      errors.invalidFeeConfigMethodId()
    );

    const fee = this.getFee(feeConfig);

    await this.transferFee(
      executionData.transaction.sender,
      UInt64.Unsafe.fromField(fee.value)
    );
  }

  public async afterTransaction(): Promise<void> {
    noop();
  }

  public async removeTransactionWhen(
    args: BeforeTransactionHookArguments
  ): Promise<boolean> {
    const feeConfig = this.feeAnalyzer.getFeeConfig(
      args.transaction.methodId.toBigInt()
    );

    const fee = this.getFee(feeConfig);

    const tokenId = new TokenId(this.config.tokenId);
    const feeRecipient = PublicKey.fromBase58(this.config.feeRecipient);

    const balanceAvailable = await this.balances.balances.get({
      tokenId,
      address: feeRecipient,
    });

    return balanceAvailable
      .orElse(Balance.from(0))
      .greaterThanOrEqual(fee)
      .toBoolean();
  }
}
