import { inject, injectable, Lifecycle, scoped } from "tsyringe";
import { Runtime } from "@proto-kit/module";
import { Field, VerificationKey } from "o1js";
import { log } from "@proto-kit/common";

import { TaskSerializer } from "../../../worker/flow/Task";
import { VKRecord } from "../../runtime/RuntimeVerificationKeyService";
import { UnpreparingTask } from "../../../worker/flow/UnpreparingTask";

type VKRecordLite = Record<
  string,
  { vk: { hash: string; data: string }; index: string }
>;

export class DefaultSerializer implements TaskSerializer<undefined> {
  public toJSON(parameters: undefined): string {
    return "";
  }

  public fromJSON(json: string): undefined {
    return undefined;
  }
}

export class VKResultSerializer implements TaskSerializer<VKRecord> {
  public toJSON(input: VKRecord): string {
    const temp: VKRecordLite = Object.keys(input).reduce<VKRecordLite>(
      (accum, key) => {
        return {
          ...accum,
          [key]: {
            vk: {
              hash: input[key].vk.hash.toString(),
              data: input[key].vk.data,
            },
            index: input[key].index.toString(),
          },
        };
      },
      {}
    );
    return JSON.stringify(temp);
  }

  public fromJSON(json: string): VKRecord {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const temp: VKRecordLite = JSON.parse(json);
    return Object.keys(temp).reduce<VKRecord>((accum, key) => {
      return {
        ...accum,
        [key]: {
          vk: new VerificationKey({
            data: temp[key].vk.data,
            hash: Field(temp[key].vk.hash),
          }),
          index: BigInt(temp[key].index),
        },
      };
    }, {});
  }
}

@injectable()
@scoped(Lifecycle.ContainerScoped)
export class CircuitCompilerTask extends UnpreparingTask<undefined, VKRecord> {
  public name = "compiledCircuit";

  public constructor(
    @inject("Runtime") protected readonly runtime: Runtime<never>
  ) {
    super();
  }

  public inputSerializer(): TaskSerializer<undefined> {
    return new DefaultSerializer();
  }

  public resultSerializer(): TaskSerializer<VKRecord> {
    return new VKResultSerializer();
  }

  public async compute(): Promise<VKRecord> {
    log.info("Computing VKs");

    let methodCounter = 0;
    return await this.runtime.zkProgrammable.zkProgram.reduce<
      Promise<VKRecord>
    >(async (accum, program) => {
      const vk = (await program.compile()).verificationKey;

      const vkRecordStep = Object.keys(program.methods).reduce<VKRecord>(
        (previousRecord, combinedMethodName) => {
          const [moduleName, methodName] = combinedMethodName.split(".");
          const methodId = this.runtime.methodIdResolver.getMethodId(
            moduleName,
            methodName
          );
          return {
            ...previousRecord,
            [methodId.toString()]: {
              vk,
              // eslint-disable-next-line no-plusplus
              index: BigInt(methodCounter++),
            },
          };
        },
        {}
      );

      const vkRecord = await accum;
      return {
        ...vkRecord,
        ...vkRecordStep,
      };
    }, Promise.resolve({}));
  }
}
