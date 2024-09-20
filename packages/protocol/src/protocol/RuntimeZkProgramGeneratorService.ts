import { Field, Poseidon, Struct, VerificationKey } from "o1js";
import {
  createMerkleTree,
  InMemoryMerkleTreeStorage,
  ConfigurableModule,
} from "@proto-kit/common";
import { container, inject } from "tsyringe";
import { Runtime, RuntimeModulesRecord } from "@proto-kit/module";

import { NetworkState } from "../model/network/NetworkState";
import { RuntimeTransaction } from "../model/transaction/RuntimeTransaction";
import { RuntimeMethodExecutionContext } from "../state/context/RuntimeMethodExecutionContext";

export const treeFeeHeight = 10;
export class ZkProgramTree extends createMerkleTree(treeFeeHeight) {}

export interface MethodZkProgramConfig {
  methodId: bigint;
  vkHash: string;
  vk: VerificationKey;
}

export interface ZkProgramTreeValues {
  [methodId: string]: MethodZkProgramConfig;
}

export interface ZkProgramIndexes {
  [methodId: string]: bigint;
}

export class MethodZkProgramConfigData extends Struct({
  methodId: Field,
  vkHash: Field,
}) {
  public hash() {
    return Poseidon.hash(MethodZkProgramConfigData.toFields(this));
  }
}
export class RuntimeZkProgramGeneratorService extends ConfigurableModule<{}> {
  public constructor(
    @inject("Runtime") public runtime: Runtime<RuntimeModulesRecord>
  ) {
    super();
  }

  public static getWitnessType() {
    return ZkProgramTree.WITNESS;
  }

  private persistedZkProgramTree?: {
    tree: ZkProgramTree;
    values: ZkProgramTreeValues;
    indexes: ZkProgramIndexes;
  };

  private persistedVk?: {
    [methodId: string]: VerificationKey;
  };

  public async initializeZkProgramTree() {
    const context = container.resolve<RuntimeMethodExecutionContext>(
      RuntimeMethodExecutionContext
    );

    context.setup({
      transaction: RuntimeTransaction.dummyTransaction(),
      networkState: NetworkState.empty(),
    });

    container.resolve(RuntimeMethodExecutionContext).clear();

    const [values, indexes] =
      await this.runtime.zkProgrammable.zkProgram.reduce<
        Promise<[ZkProgramTreeValues, ZkProgramIndexes]>
      >(
        async (accum, program) => {
          const vk = (await program.compile()).verificationKey;
          const [valuesMeth, indexesMeth] = Object.keys(program.methods).reduce<
            [ZkProgramTreeValues, ZkProgramIndexes]
          >(
            // eslint-disable-next-line @typescript-eslint/no-shadow
            ([values, indexes], combinedMethodName, index) => {
              const [moduleName, methodName] = combinedMethodName.split(".");
              const methodId = this.runtime.methodIdResolver.getMethodId(
                moduleName,
                methodName
              );
              return [
                {
                  ...values,

                  [methodId.toString()]: {
                    methodId,
                    vk: vk,
                    vkHash: vk.hash.toString(),
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
          const [valuesProg, indexesProg] = await accum;
          return [
            { ...valuesProg, ...valuesMeth },
            { ...indexesProg, ...indexesMeth },
          ];
        },
        Promise.resolve([{}, {}])
      );

    const tree = new ZkProgramTree(new InMemoryMerkleTreeStorage());
    const valuesVK: Record<string, { data: string; hash: Field }> = {};

    Object.values(values).forEach((value, index) => {
      const ZkProgramConfig = new MethodZkProgramConfigData({
        methodId: Field(value.methodId),
        vkHash: Field(value.vkHash),
      });
      tree.setLeaf(BigInt(index), ZkProgramConfig.hash());
      valuesVK[value.methodId.toString()] = value.vk;
    });

    this.persistedZkProgramTree = { tree, values, indexes };
    this.persistedVk = valuesVK;
  }

  public getZkProgramTree() {
    if (this.persistedZkProgramTree === undefined) {
      throw new Error("ZkProgram Tree not intialized");
    }

    return this.persistedZkProgramTree;
  }

  public getVkRecord() {
    if (this.persistedVk === undefined) {
      throw new Error("VK record nots intialized");
    }

    return this.persistedVk;
  }

  public getVkRecordEntry(methodId: bigint) {
    const persistedVk = this.getVkRecord();
    return persistedVk[methodId.toString()];
  }

  public getZkProgramConfig(methodId: bigint) {
    const zkProgramConfig = this.getZkProgramTree().values[methodId.toString()];

    return new MethodZkProgramConfigData({
      methodId: Field(zkProgramConfig.methodId),
      vkHash: Field(zkProgramConfig.vkHash),
    });
  }

  public getWitness(methodId: bigint) {
    const zkprogramTree = this.getZkProgramTree();
    return zkprogramTree.tree.getWitness(
      zkprogramTree.indexes[methodId.toString()]
    );
  }

  public getRoot(): bigint {
    const { tree } = this.getZkProgramTree();
    return tree.getRoot().toBigInt();
  }
}
