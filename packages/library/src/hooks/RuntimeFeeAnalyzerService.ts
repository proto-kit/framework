/* eslint-disable import/no-unused-modules */
import {
  ConfigurableModule,
  createMerkleTree,
  InMemoryMerkleTreeStorage,
} from "@proto-kit/common";
import { Runtime, RuntimeModulesRecord } from "@proto-kit/module";
import { container, inject } from "tsyringe";
import {
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

export interface MethodFeeConfig {
  methodId: bigint;
  baseFee: bigint;
  perWeightUnitFee: bigint;
  weight: bigint;
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

export const treeFeeHeight = 10;
export class FeeTree extends createMerkleTree(treeFeeHeight) {}

export interface RuntimeFeeAnalyzerServiceConfig {
  tokenId: bigint;
  feeRecipient: string;
  baseFee: bigint;
  perWeightUnitFee: bigint;
  methods: {
    [methodId: string]: Partial<MethodFeeConfig>;
  };
}

export class RuntimeFeeAnalyzerService extends ConfigurableModule<RuntimeFeeAnalyzerServiceConfig> {
  public static getWitnessType() {
    return FeeTree.WITNESS;
  }

  private persistedFeeTree?: {
    tree: FeeTree;
    values: FeeTreeValues;
    indexes: FeeIndexes;
  };

  public constructor(
    @inject("Runtime") public runtime: Runtime<RuntimeModulesRecord>
  ) {
    super();
  }

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

  public getFeeConfig(methodId: bigint) {
    const feeConfig = this.feeTree.values[methodId.toString()];

    return new MethodFeeConfigData({
      methodId: Field(feeConfig.methodId),
      baseFee: UInt64.from(feeConfig.baseFee),
      weight: UInt64.from(feeConfig.weight),
      perWeightUnitFee: UInt64.from(feeConfig.perWeightUnitFee),
    });
  }

  public getWitness(methodId: bigint) {
    return this.feeTree.tree.getWitness(
      this.feeTree.indexes[methodId.toString()]
    );
  }

  public getRoot(): bigint {
    return this.feeTree.tree.getRoot().toBigInt();
  }
}
