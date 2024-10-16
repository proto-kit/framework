import { inject, injectable, Lifecycle, scoped } from "tsyringe";
import { Runtime } from "@proto-kit/module";
import { Field, VerificationKey } from "o1js";
import { log, mapSequential, MOCK_VERIFICATION_KEY } from "@proto-kit/common";

import { TaskSerializer } from "../../../worker/flow/Task";
import { VKRecord } from "../../runtime/RuntimeVerificationKeyService";
import { UnpreparingTask } from "../../../worker/flow/UnpreparingTask";
import {
  MandatorySettlementModulesRecord,
  Protocol,
  ProtocolModulesRecord,
  SettlementContractModule,
} from "@proto-kit/protocol";
import { VerificationKeySerializer } from "../helpers/VerificationKeySerializer";

export type CompiledCircuitsRecord = {
  protocolCircuits: VKRecord;
  runtimeCircuits: VKRecord;
};

type VKRecordLite = Record<string, { vk: { hash: string; data: string } }>;

export class UndefinedSerializer implements TaskSerializer<undefined> {
  public toJSON(parameters: undefined): string {
    return "";
  }

  public fromJSON(json: string): undefined {
    return undefined;
  }
}

export class VKResultSerializer {
  public toJSON(input: VKRecord): VKRecordLite {
    const temp: VKRecordLite = Object.keys(input).reduce<VKRecordLite>(
      (accum, key) => {
        return {
          ...accum,
          [key]: {
            vk: VerificationKeySerializer.toJSON(input[key].vk),
          },
        };
      },
      {}
    );
    return temp;
  }

  public fromJSON(json: VKRecordLite): VKRecord {
    return Object.keys(json).reduce<VKRecord>((accum, key) => {
      return {
        ...accum,
        [key]: {
          vk: VerificationKeySerializer.fromJSON(json[key].vk),
        },
      };
    }, {});
  }
}

@injectable()
@scoped(Lifecycle.ContainerScoped)
export class CircuitCompilerTask extends UnpreparingTask<
  undefined,
  CompiledCircuitsRecord
> {
  public name = "compiledCircuit";

  public constructor(
    @inject("Runtime") protected readonly runtime: Runtime<never>,
    @inject("Protocol") protected readonly protocol: Protocol<any>
  ) {
    super();
  }

  public inputSerializer(): TaskSerializer<undefined> {
    return new UndefinedSerializer();
  }

  public resultSerializer(): TaskSerializer<CompiledCircuitsRecord> {
    const vkRecordSerializer = new VKResultSerializer();
    return {
      fromJSON: (json) => {
        const temp = JSON.parse(json);
        return {
          runtimeCircuits: vkRecordSerializer.fromJSON(temp["runtimeCircuits"]),
          protocolCircuits: vkRecordSerializer.fromJSON(
            temp["protocolCircuits"]
          ),
        };
      },
      toJSON: (input) => {
        return JSON.stringify({
          runtimeCircuits: vkRecordSerializer.toJSON(input.runtimeCircuits),
          protocolCircuits: vkRecordSerializer.toJSON(input.protocolCircuits),
        });
      },
    };
  }

  public async compileRuntimeMethods() {
    log.info("Compiling runtime circuits");
    return await mapSequential(
      this.runtime.zkProgrammable.zkProgram,
      async (program) => {
        const vk = (await program.compile()).verificationKey;

        const vkRecordStep = Object.keys(program.methods).map(
          (combinedMethodName) => {
            const [moduleName, methodName] = combinedMethodName.split(".");
            const methodId = this.runtime.methodIdResolver.getMethodId(
              moduleName,
              methodName
            );
            return [methodId.toString(), vk] as [string, VerificationKey];
          }
        );

        return vkRecordStep;
      }
    );
  }

  public async compileProtocolCircuits(): Promise<
    [string, VerificationKey][][]
  > {
    log.info("Compiling protocol circuits");
    // We only care about the BridgeContract for now - later with cachine,
    // we might want to expand that to all protocol circuits
    const container = this.protocol.dependencyContainer;
    if (container.isRegistered("SettlementContractModule")) {
      const settlementModule = container.resolve<
        SettlementContractModule<MandatorySettlementModulesRecord>
      >("SettlementContractModule");

      const BridgeClass = settlementModule.getContractClasses().bridge;
      const artifact = await BridgeClass.compile();
      return [[["BridgeContract", artifact.verificationKey]]];
    }
    return [[]];
  }

  public collectRecord(tuples: [string, VerificationKey][][]): VKRecord {
    return tuples.flat().reduce<VKRecord>((acc, step) => {
      acc[step[0]] = { vk: step[1] };
      return acc;
    }, {});
  }

  public async compute(): Promise<CompiledCircuitsRecord> {
    log.info("Computing VKs");

    const runtimeTuples = await this.compileRuntimeMethods();
    const runtimeRecord = this.collectRecord(runtimeTuples);

    const protocolTuples = await this.compileProtocolCircuits();
    const protocolRecord = this.collectRecord(protocolTuples);

    return {
      runtimeCircuits: runtimeRecord,
      protocolCircuits: protocolRecord,
    };
  }
}
