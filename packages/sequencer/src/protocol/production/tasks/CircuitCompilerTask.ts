import { inject, injectable, Lifecycle, scoped } from "tsyringe";
import { Runtime } from "@proto-kit/module";
import { VerificationKey } from "o1js";

import { TaskWorkerModule } from "../../../worker/worker/TaskWorkerModule";
import { Task, TaskSerializer } from "../../../worker/flow/Task";
import { ProofTaskSerializer } from "../../../helpers/utils";

import {
  RuntimeProofParameters,
  RuntimeProofParametersSerializer,
} from "./RuntimeTaskParameters";

export interface VKTreeValues {
  [methodId: string]: MethodVKConfig;
}

export interface VKIndexes {
  [methodId: string]: bigint;
}

export interface MethodVKConfig {
  methodId: bigint;
  vkHash: string;
  vk: VerificationKey;
}

type CompiledResult = [VKTreeValues, VKIndexes];

@injectable()
@scoped(Lifecycle.ContainerScoped)
export class CircuitCompilerTask
  extends TaskWorkerModule
  implements Task<RuntimeProofParameters, CompiledResult>
{
  protected readonly runtimeZkProgrammable =
    this.runtime.zkProgrammable.zkProgram;

  public name = "compiledCircuit";

  public constructor(
    @inject("Runtime") protected readonly runtime: Runtime<never>
  ) {
    super();
  }

  public inputSerializer(): TaskSerializer<RuntimeProofParameters> {
    return new RuntimeProofParametersSerializer();
  }

  public resultSerializer(): TaskSerializer<CompiledResult> {
    return new ProofTaskSerializer(this.runtimeZkProgrammable[0].Proof);
  }

  public async compute(input: RuntimeProofParameters): Promise<CompiledResult> {
    let methodCounter = 0;
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
                  // eslint-disable-next-line no-plusplus
                  [methodId.toString()]: BigInt(methodCounter++),
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

    return [values, indexes];
  }

  public async prepare(): Promise<void> {
    return await Promise.resolve();
  }
}
