import {
  log,
  noop,
  ArtifactRecord,
  ChildVerificationKeyService,
  CompileRegistry,
  safeParseJson,
} from "@proto-kit/common";
import { inject, injectable } from "tsyringe";
import {
  Protocol,
  RuntimeVerificationKeyRootService,
  SettlementSmartContractBase,
} from "@proto-kit/protocol";
import { VerificationKey } from "o1js";

import { Task } from "../../flow/Task";
import { AbstractStartupTask } from "../../flow/AbstractStartupTask";
import {
  VerificationKeyJSON,
  VerificationKeySerializer,
} from "../../../protocol/production/helpers/VerificationKeySerializer";
import {
  ArtifactRecordSerializer,
  SerializedArtifactRecord,
} from "../../../protocol/production/tasks/CircuitCompilerTask";
import { SettlementModule } from "../../../settlement/SettlementModule";

import { CloseWorkerError } from "./CloseWorkerError";

export type WorkerStartupPayload = {
  runtimeVerificationKeyRoot: bigint;
  // This has to be nullable, since
  bridgeContractVerificationKey?: VerificationKey;
  compiledArtifacts: ArtifactRecord;
  signedSettlements: boolean;
};

@injectable()
export class WorkerRegistrationTask
  extends AbstractStartupTask<WorkerStartupPayload, boolean>
  implements Task<WorkerStartupPayload, boolean>
{
  // Theoretically not needed anymore, but still nice as a safeguard against double execution
  private done = false;

  public constructor(
    @inject("Protocol") private readonly protocol: Protocol<any>,
    @inject("SettlementModule") settlementModule: SettlementModule,
    private readonly compileRegistry: CompileRegistry
  ) {
    super();
  }

  public name = "worker-registration";

  public async prepare() {
    noop();
  }

  public async compute(input: WorkerStartupPayload) {
    if (this.done) {
      log.info("Done, trying to close worker");
      throw new CloseWorkerError("Already started");
    }

    const rootService = this.protocol.dependencyContainer.resolve(
      RuntimeVerificationKeyRootService
    );
    rootService.setRoot(input.runtimeVerificationKeyRoot);

    if (input.bridgeContractVerificationKey !== undefined) {
      SettlementSmartContractBase.args.BridgeContractVerificationKey =
        input.bridgeContractVerificationKey;
    }

    SettlementSmartContractBase.args.signedSettlements =
      input.signedSettlements;

    this.compileRegistry.addArtifactsRaw(input.compiledArtifacts);
    this.protocol.dependencyContainer
      .resolve(ChildVerificationKeyService)
      .setCompileRegistry(this.compileRegistry);

    this.events.emit("startup-task-finished");

    this.done = true;
    return true;
  }

  public inputSerializer() {
    type WorkerStartupPayloadJSON = {
      runtimeVerificationKeyRoot: string;
      bridgeContractVerificationKey: VerificationKeyJSON | undefined;
      compiledArtifacts: SerializedArtifactRecord;
      signedSettlements: boolean;
    };

    const artifactSerializer = new ArtifactRecordSerializer();
    return {
      toJSON: (payload: WorkerStartupPayload) => {
        return JSON.stringify({
          runtimeVerificationKeyRoot:
            payload.runtimeVerificationKeyRoot.toString(),
          bridgeContractVerificationKey:
            payload.bridgeContractVerificationKey !== undefined
              ? VerificationKeySerializer.toJSON(
                  payload.bridgeContractVerificationKey
                )
              : undefined,
          compiledArtifacts: artifactSerializer.toJSON(
            payload.compiledArtifacts
          ),
          signedSettlements: payload.signedSettlements,
        } satisfies WorkerStartupPayloadJSON);
      },
      fromJSON: (payload: string) => {
        const jsonObject = safeParseJson<WorkerStartupPayloadJSON>(payload);

        return {
          runtimeVerificationKeyRoot: BigInt(
            jsonObject.runtimeVerificationKeyRoot
          ),
          bridgeContractVerificationKey:
            jsonObject.bridgeContractVerificationKey !== undefined
              ? VerificationKeySerializer.fromJSON(
                  jsonObject.bridgeContractVerificationKey
                )
              : undefined,
          compiledArtifacts: artifactSerializer.fromJSON(
            jsonObject.compiledArtifacts
          ),
          signedSettlements: jsonObject.signedSettlements,
        };
      },
    };
  }

  public resultSerializer() {
    return {
      toJSON: (payload: boolean) => String(payload),
      fromJSON: (payload: string) => Boolean(payload),
    };
  }
}
