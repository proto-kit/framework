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
export class VKTree extends createMerkleTree(treeFeeHeight) {}

export interface MethodVKConfig {
  methodId: bigint;
  vkHash: string;
  vk: VerificationKey;
}

export interface VKTreeValues {
  [methodId: string]: MethodVKConfig;
}

export interface VKIndexes {
  [methodId: string]: bigint;
}

export class MethodVKConfigData extends Struct({
  methodId: Field,
  vkHash: Field,
}) {
  public hash() {
    return Poseidon.hash(MethodVKConfigData.toFields(this));
  }
}
export class VerificationKeyService extends ConfigurableModule<{}> {
  public constructor(
    @inject("Runtime") public runtime: Runtime<RuntimeModulesRecord>
  ) {
    super();
  }

  public static getWitnessType() {
    return VKTree.WITNESS;
  }

  private persistedVKTree?: {
    tree: VKTree;
    values: VKTreeValues;
    indexes: VKIndexes;
  };

  private persistedVKRecord?: {
    [methodId: string]: VerificationKey;
  };

  public async initializeVKTree() {
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
        Promise<[VKTreeValues, VKIndexes]>
      >(
        async (accum, program) => {
          const vk = (await program.compile()).verificationKey;
          const [valuesMeth, indexesMeth] = Object.keys(program.methods).reduce<
            [VKTreeValues, VKIndexes]
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

    const tree = new VKTree(new InMemoryMerkleTreeStorage());
    const valuesVK: Record<string, { data: string; hash: Field }> = {};

    Object.values(values).forEach((value, index) => {
      const vkConfig = new MethodVKConfigData({
        methodId: Field(value.methodId),
        vkHash: Field(value.vkHash),
      });
      tree.setLeaf(BigInt(index), vkConfig.hash());
      valuesVK[value.methodId.toString()] = value.vk;
    });

    this.persistedVKTree = { tree, values, indexes };
    this.persistedVKRecord = valuesVK;
  }

  public getVKTree() {
    if (this.persistedVKTree === undefined) {
      throw new Error("ZkProgram Tree not intialized");
    }

    return this.persistedVKTree;
  }

  public getVkRecord() {
    if (this.persistedVKRecord === undefined) {
      throw new Error("VK record nots intialized");
    }

    return this.persistedVKRecord;
  }

  public getVkRecordEntry(methodId: bigint) {
    const persistedVk = this.getVkRecord();
    return persistedVk[methodId.toString()];
  }

  public getVKConfig(methodId: bigint) {
    const vkConfig = this.getVKTree().values[methodId.toString()];

    return new MethodVKConfigData({
      methodId: Field(vkConfig.methodId),
      vkHash: Field(vkConfig.vkHash),
    });
  }

  public getWitness(methodId: bigint) {
    const vkTree = this.getVKTree();
    return vkTree.tree.getWitness(vkTree.indexes[methodId.toString()]);
  }

  public getRoot(): bigint {
    const { tree } = this.getVKTree();
    return tree.getRoot().toBigInt();
  }
}
