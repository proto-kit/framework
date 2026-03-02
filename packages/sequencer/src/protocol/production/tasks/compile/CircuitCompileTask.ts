import {
  log,
  mapSequential,
  ArtifactRecord,
  CompileRegistry,
  CompilableModule,
  safeParseJson,
} from "@proto-kit/common";
import {
  Protocol,
  RuntimeVerificationKeyRootService,
  MandatoryProtocolModulesRecord,
  BridgingSettlementContractArgs,
  ContractArgsRegistry,
} from "@proto-kit/protocol";

import { TaskSerializer } from "../../../../worker/flow/Task";
import { UnpreparingTask } from "../../../../worker/flow/UnpreparingTask";
import { SignedSettlementPermissions } from "../../../../settlement/permissions/SignedSettlementPermissions";
import { ProvenSettlementPermissions } from "../../../../settlement/permissions/ProvenSettlementPermissions";
import {
  ArtifactRecordSerializer,
  SerializedArtifactRecord,
} from "../serializers/ArtifactionRecordSerializer";

export type CompilerTaskParams = {
  existingArtifacts: ArtifactRecord;
  runtimeVKRoot?: string;
  isSignedSettlement?: boolean;
};

export abstract class CircuitCompileTask extends UnpreparingTask<
  CompilerTaskParams,
  ArtifactRecord
> {
  protected constructor(
    protected readonly protocol: Protocol<MandatoryProtocolModulesRecord>,
    protected readonly compileRegistry: CompileRegistry,
    protected readonly contractArgsRegistry: ContractArgsRegistry
  ) {
    super();
  }

  public inputSerializer(): TaskSerializer<CompilerTaskParams> {
    type CompilerTaskParamsJSON = {
      runtimeVKRoot?: string;
      existingArtifacts: SerializedArtifactRecord;
      isSignedSettlement?: boolean;
    };

    const serializer = new ArtifactRecordSerializer();
    return {
      toJSON: (input) =>
        JSON.stringify({
          runtimeVKRoot: input.runtimeVKRoot,
          existingArtifacts: serializer.toJSON(input.existingArtifacts),
          isSignedSettlement: input.isSignedSettlement,
        } satisfies CompilerTaskParamsJSON),
      fromJSON: (input) => {
        const json = safeParseJson<CompilerTaskParamsJSON>(input);
        return {
          runtimeVKRoot: json.runtimeVKRoot,
          existingArtifacts: serializer.fromJSON(json.existingArtifacts),
          isSignedSettlement: json.isSignedSettlement,
        };
      },
    };
  }

  public resultSerializer(): TaskSerializer<ArtifactRecord> {
    const serializer = new ArtifactRecordSerializer();
    return {
      toJSON: (input) => JSON.stringify(serializer.toJSON(input)),
      fromJSON: (input) =>
        serializer.fromJSON(safeParseJson<SerializedArtifactRecord>(input)),
    };
  }

  public abstract getTargets(): Promise<CompilableModule[]>;

  public async compute(input: CompilerTaskParams): Promise<ArtifactRecord> {
    log.info("Computing VKs");

    this.compileRegistry.addArtifactsRaw(input.existingArtifacts);

    // We need to initialize the VK tree root if we have it, so that
    // the BlockProver can bake in that root
    if (input.runtimeVKRoot !== undefined) {
      this.protocol.dependencyContainer
        .resolve(RuntimeVerificationKeyRootService)
        .setRoot(BigInt(input.runtimeVKRoot));
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

    const targets = await this.getTargets();

    const msg = `Compiling targets ${this.name}`;
    log.time(msg);
    await mapSequential(targets, async (target) => {
      await target.compile(this.compileRegistry);
    });
    log.timeEnd.info(msg);

    const newEntries = Object.entries(
      this.compileRegistry.getAllArtifacts()
    ).filter(([key]) => !(key in input.existingArtifacts));
    return Object.fromEntries(newEntries);
  }
}
