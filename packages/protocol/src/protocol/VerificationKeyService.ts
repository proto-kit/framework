import { Field, Poseidon, Struct, VerificationKey } from "o1js";
import {
  createMerkleTree,
  InMemoryMerkleTreeStorage,
  ConfigurableModule,
  ZkProgrammable,
} from "@proto-kit/common";
import { inject, injectable } from "tsyringe";

import { MethodPublicOutput } from "../model/MethodPublicOutput";

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

export type VKRecord = {
  [methodId: string]: {
    vk: VerificationKey;
    index: bigint;
  };
};

export class MethodVKConfigData extends Struct({
  methodId: Field,
  vkHash: Field,
}) {
  public hash() {
    return Poseidon.hash(MethodVKConfigData.toFields(this));
  }
}
export interface WithGetMethodId {
  getMethodId: (moduleName: string, methodName: string) => bigint;
}

export interface WithZkProgrammableAndGetMethodById<PublicInput, PublicOutput> {
  zkProgrammable: ZkProgrammable<PublicInput, PublicOutput>;
  methodIdResolver: WithGetMethodId;
}
@injectable()
export class VerificationKeyService extends ConfigurableModule<{}> {
  public constructor(
    @inject("Runtime")
    public runtime: WithZkProgrammableAndGetMethodById<
      undefined,
      MethodPublicOutput
    >
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

  public async initializeVKTree(verificationKeys: VKRecord) {
    // const context = container.resolve<RuntimeMethodExecutionContext>(
    //   RuntimeMethodExecutionContext
    // );
    // context.setup({
    //   transaction: RuntimeTransaction.dummyTransaction(),
    //   networkState: NetworkState.empty(),
    // });

    // container.resolve(RuntimeMethodExecutionContext).clear();

    const tree = new VKTree(new InMemoryMerkleTreeStorage());
    const valuesVK: Record<string, { data: string; hash: Field }> = {};
    const indexes: VKIndexes = {};
    const values: VKTreeValues = {};

    Object.entries(verificationKeys).forEach(([key, value]) => {
      const vkConfig = new MethodVKConfigData({
        methodId: Field(key),
        vkHash: Field(value.vk.hash),
      });
      values[key] = {
        methodId: BigInt(key),
        vkHash: vkConfig.hash().toBigInt().toString(),
        vk: value.vk,
      };
      indexes[key] = BigInt(value.index);
      tree.setLeaf(BigInt(value.index), vkConfig.hash());
      valuesVK[key.toString()] = value.vk;
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
