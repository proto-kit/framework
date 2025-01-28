import { Field, VerificationKey } from "o1js";
import {
  CompileArtifact,
  ConfigurableModule,
  InMemoryMerkleTreeStorage,
  mapSequential,
  ZkProgrammable,
} from "@proto-kit/common";
import { inject, injectable, Lifecycle, scoped } from "tsyringe";
import {
  MethodPublicOutput,
  MethodVKConfigData,
  RuntimeVerificationKeyAttestation,
  VKTree,
} from "@proto-kit/protocol";

export interface VKIndexes {
  [methodId: string]: bigint;
}

export type VKRecord = {
  [methodId: string]: {
    vk: VerificationKey;
  };
};

export interface WithGetMethodId {
  getMethodId: (moduleName: string, methodName: string) => bigint;
}

export interface WithZkProgrammableAndGetMethodById<PublicInput, PublicOutput> {
  zkProgrammable: ZkProgrammable<PublicInput, PublicOutput>;
  methodIdResolver: WithGetMethodId;
}

@injectable()
@scoped(Lifecycle.ContainerScoped)
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

  private persistedVKTree?: {
    tree: VKTree;
    indexes: VKIndexes;
  };

  private persistedVKRecord?: {
    [methodId: string]: VerificationKey;
  };

  public collectRecord(tuples: [string, VerificationKey][][]): VKRecord {
    return tuples.flat().reduce<VKRecord>((acc, step) => {
      acc[step[0]] = { vk: step[1] };
      return acc;
    }, {});
  }

  public async initializeVKTree(artifacts: Record<string, CompileArtifact>) {
    const mappings = await mapSequential(
      this.runtime.zkProgrammable.zkProgram,
      async (program) => {
        const artifact = artifacts[program.name];

        if (artifact === undefined) {
          throw new Error(
            `Compiled artifact for runtime program ${program.name} not found`
          );
        }

        return Object.keys(program.methods).map((combinedMethodName) => {
          const [moduleName, methodName] = combinedMethodName.split(".");
          const methodId = this.runtime.methodIdResolver.getMethodId(
            moduleName,
            methodName
          );
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          return [
            methodId.toString(),
            new VerificationKey(artifact.verificationKey),
          ] as [string, VerificationKey];
        });
      }
    );
    return await this.initializeVKTreeFromMethodMappings(
      this.collectRecord(mappings)
    );
  }

  private async initializeVKTreeFromMethodMappings(verificationKeys: VKRecord) {
    const tree = new VKTree(new InMemoryMerkleTreeStorage());
    const valuesVK: Record<string, { data: string; hash: Field }> = {};
    const indexes: VKIndexes = {};

    Object.entries(verificationKeys)
      // eslint-disable-next-line no-nested-ternary
      .sort(([key], [key2]) => (key > key2 ? 1 : key === key2 ? 0 : -1))
      .forEach(([key, value], index) => {
        const vkConfig = new MethodVKConfigData({
          methodId: Field(key),
          vkHash: Field(value.vk.hash),
        });
        indexes[key] = BigInt(index);
        tree.setLeaf(BigInt(index), vkConfig.hash());
        valuesVK[key.toString()] = value.vk;
      });

    this.persistedVKTree = { tree, indexes };
    this.persistedVKRecord = valuesVK;
  }

  public getVKTree() {
    if (this.persistedVKTree === undefined) {
      throw new Error("ZkProgram Tree not initialized");
    }

    return this.persistedVKTree;
  }

  public getVkRecord() {
    if (this.persistedVKRecord === undefined) {
      throw new Error("VK record not initialized");
    }

    return this.persistedVKRecord;
  }

  public getAttestation(methodId: bigint) {
    const verificationKey = this.getVkRecord()[methodId.toString()];
    if (verificationKey === undefined) {
      throw new Error(
        `MethodId not registered in VerificationKeyService (${methodId})`
      );
    }

    const witness = this.getWitness(methodId);

    return new RuntimeVerificationKeyAttestation({
      verificationKey,
      witness,
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
