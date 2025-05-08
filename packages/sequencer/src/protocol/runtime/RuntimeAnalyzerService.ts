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

export type RuntimeMethodMetadata = {
  rows: number;
  dynamicKeyAccess: boolean;
  invocationType: RuntimeMethodInvocationType;
};

export type RuntimeInfo = Record<string, RuntimeMethodMetadata>;

@injectable()
export class RuntimeAnalyzerService {
  public constructor(
    @inject("Runtime") public runtime: Runtime<RuntimeModulesRecord>
  ) {}

  private computedRuntimeInfo:
    | Record<string, RuntimeMethodMetadata>
    | undefined = undefined;

  private async computeRuntimeInfo(): Promise<RuntimeInfo> {
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
          // eslint-disable-next-line max-len
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions,@typescript-eslint/no-unsafe-argument
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

  public async getRuntimeInfo(): Promise<RuntimeInfo> {
    if (this.computedRuntimeInfo === undefined) {
      this.computedRuntimeInfo = await this.computeRuntimeInfo();
    }
    return this.computedRuntimeInfo;
  }
}
