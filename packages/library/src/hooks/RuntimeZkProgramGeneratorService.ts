import { Field, UInt64 } from "o1js";
import { InMemoryMerkleTreeStorage } from "packages/common/dist";
import { ConfigurableModule } from "packages/common/dist/config/ConfigurableModule";
import { NetworkState, RuntimeTransaction } from "packages/protocol/dist";
import { RuntimeMethodExecutionContext } from "packages/protocol/dist/state/context/RuntimeMethodExecutionContext";
import { container } from "tsyringe";
import {
  FeeTreeValues,
  FeeIndexes,
  FeeTree,
  MethodFeeConfigData,
} from "./RuntimeFeeAnalyzerService";

export class RuntimeZkProgramGeneratorService extends ConfigurableModule<{}> {
  public async initializeFeeTree() {
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
        Promise<[FeeTreeValues, FeeIndexes]>
      >(
        async (accum, program) => {
          const analyzedMethods = await program.analyzeMethods();
          const [valuesMeth, indexesMeth] = Object.keys(program.methods).reduce<
            [FeeTreeValues, FeeIndexes]
          >(
            // eslint-disable-next-line @typescript-eslint/no-shadow
            ([values, indexes], combinedMethodName, index) => {
              const { rows } = analyzedMethods[combinedMethodName];
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
                      this.config.methods[combinedMethodName]
                        ?.perWeightUnitFee ?? this.config.perWeightUnitFee,

                    weight:
                      this.config.methods[combinedMethodName]?.weight ??
                      BigInt(rows),
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

    this.persistedFeeTree = { tree, values, indexes };
  }
}
