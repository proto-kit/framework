import {
  log,
  ArtifactRecord,
  ChildVerificationKeyService,
  CompileRegistry,
  safeParseJson,
  ModuleContainerLike,
} from "@proto-kit/common";
import { inject, injectable } from "tsyringe";
import {
  BridgingSettlementContractArgs,
  ContractArgsRegistry,
  RuntimeVerificationKeyRootService,
  SettlementContractModule,
} from "@proto-kit/protocol";
import { VerificationKey } from "o1js";

import { Task } from "../flow/Task";
import { AbstractStartupTask } from "../flow/AbstractStartupTask";
import {
  VerificationKeyJSON,
  VerificationKeySerializer,
} from "../../protocol/production/tasks/serializers/VerificationKeySerializer";
import {
  ArtifactRecordSerializer,
  SerializedArtifactRecord,
} from "../../protocol/production/tasks/serializers/ArtifactionRecordSerializer";
import { SignedSettlementPermissions } from "../../settlement/permissions/SignedSettlementPermissions";
import { ProvenSettlementPermissions } from "../../settlement/permissions/ProvenSettlementPermissions";

import { CloseWorkerError } from "./CloseWorkerError";

export type WorkerStartupPayload = {
  runtimeVerificationKeyRoot: bigint;
  // This has to be nullable, since
  bridgeContractVerificationKey?: VerificationKey;
  compiledArtifacts: ArtifactRecord;
  isSignedSettlement?: boolean;
};

@injectable()
export class WorkerRegistrationTask
  extends AbstractStartupTask<WorkerStartupPayload, boolean>
  implements Task<WorkerStartupPayload, boolean>
{
  // Theoretically not needed anymore, but still nice as a safeguard against double execution
  private done = false;

  public constructor(
    @inject("Protocol") private readonly protocol: ModuleContainerLike,
    private readonly compileRegistry: CompileRegistry,
    private readonly contractArgsRegistry: ContractArgsRegistry
  ) {
    super();
  }

  public name = "worker-registration";

  public async prepare() {
    log.info("Waiting on sequencer to send registration info...");
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

    if (
      input.bridgeContractVerificationKey !== undefined ||
      input.isSignedSettlement !== undefined
    ) {
      // Invoke this so that SettlementSmartContractBase.args is initialized
      this.protocol.dependencyContainer
        .resolve<
          SettlementContractModule<
            ReturnType<typeof SettlementContractModule.settlementOnly>
          >
        >("SettlementContractModule")
        .resolve("SettlementContract")
        .contractFactory();
    }

    if (input.bridgeContractVerificationKey !== undefined) {
      this.contractArgsRegistry.addArgs<BridgingSettlementContractArgs>(
        "SettlementContract",
        { BridgeContractVerificationKey: input.bridgeContractVerificationKey }
      );
    }

    if (input.isSignedSettlement !== undefined) {
      this.contractArgsRegistry.addArgs<BridgingSettlementContractArgs>(
        "SettlementContract",
        {
          signedSettlements: input.isSignedSettlement,
          // TODO Add distinction between mina and custom tokens
          BridgeContractPermissions: (input.isSignedSettlement
            ? new SignedSettlementPermissions()
            : new ProvenSettlementPermissions()
          ).bridgeContractMina(),
        }
      );
    }

    this.compileRegistry.addArtifactsRaw(input.compiledArtifacts);
    this.protocol.dependencyContainer
      .resolve(ChildVerificationKeyService)
      .setCompileRegistry(this.compileRegistry);

    this.events.emit("startup-task-finished");

    log.info("Worker registration completed");

    this.done = true;
    return true;
  }

  public inputSerializer() {
    type WorkerStartupPayloadJSON = {
      runtimeVerificationKeyRoot: string;
      bridgeContractVerificationKey: VerificationKeyJSON | undefined;
      compiledArtifacts: SerializedArtifactRecord;
      isSignedSettlement: boolean | undefined;
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
          isSignedSettlement: payload.isSignedSettlement,
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
          isSignedSettlement: jsonObject.isSignedSettlement,
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
