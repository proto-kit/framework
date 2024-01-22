/* eslint-disable max-classes-per-file */
/* eslint-disable import/no-unused-modules */
import { createMerkleTree, InMemoryMerkleTreeStorage } from "@proto-kit/common";
import { Runtime, RuntimeModulesRecord } from "@proto-kit/module";
import { container, inject, injectable } from "tsyringe";
import {
  ProvableTransactionHook,
  BlockProverExecutionData,
  RuntimeMethodExecutionContext,
  RuntimeTransaction,
  NetworkState,
} from "@proto-kit/protocol";
import {
  Field,
  Poseidon,
  Provable,
  PublicKey,
  Struct,
  UInt64 as O1JSUInt64,
} from "o1js";

import { UInt64 } from "../math/UInt64";

export const treeFeeHeight = 10;
export class FeeTree extends createMerkleTree(treeFeeHeight) {}

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

export interface MethodFeeConfig {
  methodId: bigint;
  baseFee: bigint;
  perWeightUnitFee: bigint;
  weight: bigint;
}

export interface TransactionFeeHookConfig {
  tokenId: bigint;
  feeRecipient: string;
  baseFee: bigint;
  perWeightUnitFee: bigint;
  methods: {
    [methodId: string]: Partial<MethodFeeConfig>;
  };
}

export interface FeeTreeValues {
  [methodId: string]: MethodFeeConfig;
}

export interface FeeIndexes {
  [methodId: string]: bigint;
}

export class MethodFeeConfigData extends Struct({
  methodId: Field,
  baseFee: UInt64,
  perWeightUnitFee: UInt64,
  weight: UInt64,
}) {
  public hash() {
    return Poseidon.hash(MethodFeeConfigData.toFields(this));
  }
}

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
  private persistedFeeTree?: {
    tree: FeeTree;
    values: FeeTreeValues;
    indexes: FeeIndexes;
  };

  public constructor(
    // dependency on runtime, since balances are part of runtime logic
    @inject("Runtime") public runtime: Runtime<RuntimeModulesRecord>
  ) {
    super();
  }

  /**
   * Creates a fee tree for determining the fee per method id. The tree is
   * indexed by an arbitrary index, which is mapped to
   * the method id via 'indexes'.
   *
   * @returns {FeeTree} Fee tree as a commitment to the fee config per method id
   */
  public createFeeTree() {
    const context = container.resolve<RuntimeMethodExecutionContext>(
      RuntimeMethodExecutionContext
    );

    // TODO: create empty setup struct for compile
    // or other places where the context is not set
    context.setup({
      transaction: new RuntimeTransaction({
        methodId: Field(0),
        nonce: O1JSUInt64.from(0),
        sender: PublicKey.empty(),
        argsHash: Field(0),
      }),

      networkState: new NetworkState({
        block: {
          height: O1JSUInt64.zero,
        },
      }),
    });

    // TODO: figure out what side effects analyzeMethods has,
    // and why it breaks runtime execution context with wierd errors
    const analyzedMethods =
      this.runtime.zkProgrammable.zkProgram.analyzeMethods();

    container.resolve(RuntimeMethodExecutionContext).clear();

    const [values, indexes] = Object.keys(
      this.runtime.zkProgrammable.zkProgram.methods
    ).reduce<[FeeTreeValues, FeeIndexes]>(
      // eslint-disable-next-line @typescript-eslint/no-shadow
      ([values, indexes], combinedMethodName, index) => {
        const { rows } = analyzedMethods[index];
        // const rows = 1000;
        const [moduleName, methodName] = combinedMethodName.split(".");
        const methodId = this.runtime.methodIdResolver.getMethodId(
          moduleName,
          methodName
        );

        /**
         * Determine the fee config for the given method id, and merge it with
         * the default fee config.
         */
        return [
          {
            ...values,

            [methodId.toString()]: {
              methodId,

              baseFee:
                this.config.methods[combinedMethodName]?.baseFee ??
                this.config.baseFee,

              perWeightUnitFee:
                this.config.methods[combinedMethodName]?.perWeightUnitFee ??
                this.config.perWeightUnitFee,

              weight:
                this.config.methods[combinedMethodName]?.weight ?? BigInt(rows),
            },
          },
          {
            ...indexes,
            [methodId.toString()]: BigInt(index),
          },
        ];
      },
      [{}, {}]
    );

    const tree = new FeeTree(new InMemoryMerkleTreeStorage());

    Object.values(values).forEach((value, index) => {
      const feeConfig = new MethodFeeConfigData({
        methodId: Field(value.methodId),
        baseFee: UInt64.from(value.baseFee),
        weight: UInt64.from(value.weight),
        perWeightUnitFee: UInt64.from(value.perWeightUnitFee),
      });
      tree.setLeaf(BigInt(index), feeConfig.hash());
    });

    return { tree, values, indexes };
  }

  public get feeTree() {
    if (this.persistedFeeTree === undefined) {
      this.persistedFeeTree = this.createFeeTree();
    }

    return this.persistedFeeTree;
  }

  /**
   * Determine the transaction fee for the given transaction, and transfer it
   * from the transaction sender to the fee recipient.
   *
   * @param executionData
   */
  public onTransaction(executionData: BlockProverExecutionData): void {
    const feeConfig = Provable.witness(MethodFeeConfigData, () => {
      // eslint-disable-next-line @typescript-eslint/no-shadow
      const feeConfig =
        this.feeTree.values[executionData.transaction.methodId.toString()];

      return new MethodFeeConfigData({
        methodId: Field(feeConfig.methodId),
        baseFee: UInt64.from(feeConfig.baseFee),
        weight: UInt64.from(feeConfig.weight),
        perWeightUnitFee: UInt64.from(feeConfig.perWeightUnitFee),
      });
    });

    const witness = Provable.witness(FeeTree.WITNESS, () =>
      this.feeTree.tree.getWitness(
        this.feeTree.indexes[executionData.transaction.methodId.toString()]
      )
    );

    const root = this.feeTree.tree.getRoot();
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

    const balances =
      this.runtime.dependencyContainer.resolve<Balances>("Balances");

    balances.transfer(
      new TokenId(this.config.tokenId),
      executionData.transaction.sender,
      PublicKey.fromBase58(this.config.feeRecipient),
      Balance.from(fee.value)
    );
  }
}
