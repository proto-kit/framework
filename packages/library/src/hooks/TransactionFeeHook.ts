/* eslint-disable import/no-unused-modules */
import { Runtime, RuntimeModulesRecord } from "@proto-kit/module";
import { inject, injectable } from "tsyringe";
import {
  ProvableTransactionHook,
  BlockProverExecutionData,
} from "@proto-kit/protocol";
import { Field, Provable, PublicKey, UInt64 as O1JSUInt64 } from "o1js";

import { UInt64 } from "../math/UInt64";

import {
  MethodFeeConfigData,
  RuntimeFeeAnalyzerService,
  RuntimeFeeAnalyzerServiceConfig,
} from "./RuntimeFeeAnalyzerService";

export class TokenId extends Field {}
export class Balance extends UInt64 {}
export interface Balances {
  transfer: (
    tokenId: TokenId,
    from: PublicKey,
    to: PublicKey,
    amount: Balance
  ) => void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TransactionFeeHookConfig
  extends RuntimeFeeAnalyzerServiceConfig {}

export const errors = {
  invalidFeeTreeRoot: () =>
    "Root hash of the provided fee config witness is invalid",

  invalidFeeConfigMethodId: () =>
    "Method id of the provided fee config does not match the executed transaction method id",
};

/**
 * Transaction hook for deducting transaction fees from the sender's balance.
 */
@injectable()
export class TransactionFeeHook extends ProvableTransactionHook<TransactionFeeHookConfig> {
  private readonly balances: Balances;

  private readonly feeAnalyzer: RuntimeFeeAnalyzerService;

  public constructor(
    // dependency on runtime, since balances are part of runtime logic
    @inject("Runtime") public runtime: Runtime<RuntimeModulesRecord>
  ) {
    super();
    this.balances =
      this.runtime.dependencyContainer.resolve<Balances>("Balances");

    this.feeAnalyzer = new RuntimeFeeAnalyzerService(this.runtime);
    this.feeAnalyzer.config = this.config;
  }

  public transferFee(from: PublicKey, fee: UInt64) {
    this.balances.transfer(
      new TokenId(this.config.tokenId),
      from,
      PublicKey.fromBase58(this.config.feeRecipient),
      Balance.from(fee.value)
    );
  }

  /**
   * Determine the transaction fee for the given transaction, and transfer it
   * from the transaction sender to the fee recipient.
   *
   * @param executionData
   */
  public onTransaction(executionData: BlockProverExecutionData): void {
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

    const fee = O1JSUInt64.from(feeConfig.baseFee.value).add(
      O1JSUInt64.from(feeConfig.weight.value).mul(
        O1JSUInt64.from(feeConfig.perWeightUnitFee.value)
      )
    );

    this.transferFee(executionData.transaction.sender, new UInt64(fee.value));
  }
}
