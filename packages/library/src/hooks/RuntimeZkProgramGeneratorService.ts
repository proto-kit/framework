import { Field, Poseidon, Struct } from "o1js";
import {
  createMerkleTree,
  InMemoryMerkleTreeStorage,
} from "packages/common/dist";
import { ConfigurableModule } from "packages/common/dist/config/ConfigurableModule";
import { NetworkState, RuntimeTransaction } from "packages/protocol/dist";
import { RuntimeMethodExecutionContext } from "packages/protocol/dist/state/context/RuntimeMethodExecutionContext";
import { container, inject } from "tsyringe";
import { Runtime, RuntimeModulesRecord } from "packages/module/dist";

export const treeFeeHeight = 10;
export class ZkProgramTree extends createMerkleTree(treeFeeHeight) {}

export interface MethodZkProgramConfig {
  methodId: bigint;
  vkHash: string;
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

  private persistedZkProgramTree?: {
    tree: ZkProgramTree;
    values: ZkProgramTreeValues;
    indexes: ZkProgramIndexes;
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
          const vk = (await program.compile()).verificationKey.hash;
          const vkHash = Poseidon.hash([vk]);
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
                    vkHash: vkHash.toString(),
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

    Object.values(values).forEach((value, index) => {
      const ZkProgramConfig = new MethodZkProgramConfigData({
        methodId: Field(value.methodId),
        vkHash: Field(value.vkHash),
      });
      tree.setLeaf(BigInt(index), ZkProgramConfig.hash());
    });

    this.persistedZkProgramTree = { tree, values, indexes };
  }

  public getZkProgramTree() {
    if (this.persistedZkProgramTree === undefined) {
      throw new Error("ZkProgram Tree not intialized");
    }

    return this.persistedZkProgramTree;
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
