import { inject, injectable, Lifecycle, scoped } from "tsyringe";
import { Runtime } from "@proto-kit/module";
import {
  log,
  mapSequential,
  StringKeyOf,
  ArtifactRecord,
  CompileRegistry,
  CompilableModule,
  safeParseJson,
  reduceSequential,
} from "@proto-kit/common";
import {
  MandatorySettlementModulesRecord,
  Protocol,
  SettlementContractModule,
  RuntimeVerificationKeyRootService,
} from "@proto-kit/protocol";

import { TaskSerializer } from "../../../worker/flow/Task";
import { UnpreparingTask } from "../../../worker/flow/UnpreparingTask";
import { VerificationKeySerializer } from "../helpers/VerificationKeySerializer";

export type CompilerTaskParams = {
  existingArtifacts: ArtifactRecord;
  targets: string[];
  runtimeVKRoot?: string;
};

export type SerializedArtifactRecord = Record<
  string,
  { verificationKey: { hash: string; data: string } }
>;

export class ArtifactRecordSerializer {
  public toJSON(input: ArtifactRecord): SerializedArtifactRecord {
    const temp: SerializedArtifactRecord = Object.keys(
      input
    ).reduce<SerializedArtifactRecord>((accum, key) => {
      return {
        ...accum,
        [key]: {
          verificationKey: VerificationKeySerializer.toJSON(
            input[key].verificationKey
          ),
        },
      };
    }, {});
    return temp;
  }

  public fromJSON(json: SerializedArtifactRecord): ArtifactRecord {
    if (json === undefined || json === null) return {};

    return Object.keys(json).reduce<ArtifactRecord>((accum, key) => {
      return {
        ...accum,
        [key]: {
          verificationKey: VerificationKeySerializer.fromJSON(
            json[key].verificationKey
          ),
        },
      };
    }, {});
  }
}

@injectable()
@scoped(Lifecycle.ContainerScoped)
export class CircuitCompilerTask extends UnpreparingTask<
  CompilerTaskParams,
  ArtifactRecord
> {
  public name = "compiledCircuit";

  public constructor(
    @inject("Runtime") protected readonly runtime: Runtime<never>,
    @inject("Protocol") protected readonly protocol: Protocol<any>,
    private readonly compileRegistry: CompileRegistry
  ) {
    super();
  }

  public inputSerializer(): TaskSerializer<CompilerTaskParams> {
    type CompilerTaskParamsJSON = {
      targets: string[];
      runtimeVKRoot?: string;
      existingArtifacts: SerializedArtifactRecord;
    };

    const serializer = new ArtifactRecordSerializer();
    return {
      toJSON: (input) =>
        JSON.stringify({
          targets: input.targets,
          runtimeVKRoot: input.runtimeVKRoot,
          existingArtifacts: serializer.toJSON(input.existingArtifacts),
        } satisfies CompilerTaskParamsJSON),
      fromJSON: (input) => {
        const json = safeParseJson<CompilerTaskParamsJSON>(input);
        return {
          targets: json.targets,
          runtimeVKRoot: json.runtimeVKRoot,
          existingArtifacts: serializer.fromJSON(json.existingArtifacts),
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

  public getSettlementTargets(): Record<string, CompilableModule> {
    // We only care about the BridgeContract for now - later with caching,
    // we might want to expand that to all protocol circuits
    const container = this.protocol.dependencyContainer;
    if (container.isRegistered("SettlementContractModule")) {
      const settlementModule = container.resolve<
        SettlementContractModule<MandatorySettlementModulesRecord>
      >("SettlementContractModule");

      // Needed so that all contractFactory functions are called, because
      // they set static args on the contracts
      settlementModule.getContractClasses();

      const moduleNames =
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        settlementModule.moduleNames as StringKeyOf<MandatorySettlementModulesRecord>[];

      const modules = moduleNames.map<[string, CompilableModule]>((name) => [
        `Settlement.${name}`,
        settlementModule.resolve(name),
      ]);

      const sumModule = {
        compile: async (registry: CompileRegistry) => {
          await reduceSequential<CompilableModule, ArtifactRecord>(
            modules.map(([, module]) => module),
            async (record, module) => {
              const artifacts = await module.compile(registry);
              return {
                ...record,
                ...artifacts,
              };
            },
            {}
          );
        },
      };

      modules.push(["Settlement", sumModule]);

      return Object.fromEntries(modules);
    }
    return {};
  }

  public async compute(input: CompilerTaskParams): Promise<ArtifactRecord> {
    this.compileRegistry.addArtifactsRaw(input.existingArtifacts);

    // We need to initialize the VK tree root if we have it, so that
    // the BlockProver can bake in that root
    if (input.runtimeVKRoot !== undefined) {
      this.protocol.dependencyContainer
        .resolve(RuntimeVerificationKeyRootService)
        .setRoot(BigInt(input.runtimeVKRoot));
    }

    log.info("Computing VKs");

    // TODO make adaptive
    const targets: Record<string, CompilableModule> = {
      runtime: this.runtime,
      protocol: this.protocol.blockProver,
      ...this.getSettlementTargets(),
    };

    const msg = `Compiling targets [${input.targets}]`;
    log.time(msg);
    await mapSequential(input.targets, async (target) => {
      if (target in targets) {
        await targets[target].compile(this.compileRegistry);
      } else {
        log.info(
          // TODO Is that right? Or should we check that the bridge exists on the sequencer side?
          `Compile target ${target} not found, skipping`
        );
      }
    });
    log.timeEnd.info(msg);

    const newEntries = Object.entries(
      this.compileRegistry.getAllArtifacts()
    ).filter(([key]) => !(key in input.existingArtifacts));
    return Object.fromEntries(newEntries);
  }
}
