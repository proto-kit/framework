import { container, inject, injectable } from "tsyringe";
import { Runtime, RuntimeModulesRecord } from "@proto-kit/module";
import {
  NetworkState,
  RuntimeMethodExecutionContext,
  RuntimeMethodInvocationType,
  RuntimeTransaction,
} from "@proto-kit/protocol";
import { mapSequential } from "@proto-kit/common";
import {
  analyzeMethod,
  sortMethodArguments,
} from "o1js/dist/node/lib/proof-system/zkprogram";
import { Void } from "o1js";

type RuntimeMethodMetadata = {
  rows: number;
  dynamicKeyAccess: boolean;
  invocationType: RuntimeMethodInvocationType;
};

@injectable()
export class RuntimeAnalyzerService {
  public constructor(
    @inject("Runtime") public runtime: Runtime<RuntimeModulesRecord>
  ) {}

  private computedRuntimeInfo:
    | Record<string, RuntimeMethodMetadata>
    | undefined = undefined;

  private async computeRuntimeInfo(): Promise<
    Record<string, RuntimeMethodMetadata>
  > {
    const context = container.resolve<RuntimeMethodExecutionContext>(
      RuntimeMethodExecutionContext
    );

    context.setup({
      transaction: RuntimeTransaction.dummyTransaction(),
      networkState: NetworkState.empty(),
    });
    context.clear();

    const runtimeMethods = this.runtime.collectMethods();

    const infos = await mapSequential(
      runtimeMethods,
      async ({
        combinedMethodName,
        privateInputs,
        method,
        invocationType,
      }): Promise<[string, RuntimeMethodMetadata]> => {
        const methodIntf = sortMethodArguments(
          "",
          combinedMethodName,
          privateInputs,
          undefined as any
        );

        const constraintSystem = await analyzeMethod(Void, methodIntf, method);

        const { result } = context.current();
        const dynamicKeyAccess = result.accessTypes.some(
          (x) => x === "dynamic"
        );

        return [
          combinedMethodName,
          {
            rows: constraintSystem.rows,
            dynamicKeyAccess,
            invocationType,
          },
        ];
      }
    );
    return Object.fromEntries(infos);
  }

  public async getRuntimeInfo(): Promise<
    Record<string, RuntimeMethodMetadata>
  > {
    if (this.computedRuntimeInfo === undefined) {
      this.computedRuntimeInfo = await this.computeRuntimeInfo();
    }
    return this.computedRuntimeInfo;
  }
}
