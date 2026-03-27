import { inject, injectable, Lifecycle, scoped } from "tsyringe";
import {
  ArtifactRecord,
  CompilableModule,
  CompileRegistry,
  log,
  reduceSequential,
  StringKeyOf,
} from "@proto-kit/common";
import {
  ContractArgsRegistry,
  MandatoryProtocolModulesRecord,
  MandatorySettlementModulesRecord,
  Protocol,
  SettlementContractModule,
  SettlementModulesRecord,
} from "@proto-kit/protocol";

import { BatchProducerModule } from "../../BatchProducerModule";
import { task } from "../../../../worker/worker/TaskWorkerModule";

import { CircuitCompileTask } from "./CircuitCompileTask";
import { BlockProducerModule } from "../../sequencing/BlockProducerModule";

@injectable()
@scoped(Lifecycle.ContainerScoped)
@task()
export class SettlementCompileTask extends CircuitCompileTask {
  public name = "compile-settlement";

  public constructor(
    @inject("Protocol")
    protocol: Protocol<MandatoryProtocolModulesRecord>,
    compileRegistry: CompileRegistry,
    contractArgsRegistry: ContractArgsRegistry,
    @inject("BlockProducerModule", { isOptional: true })
    blockProducerModule: BlockProducerModule | undefined
  ) {
    super(protocol, compileRegistry, contractArgsRegistry);

    const container = this.protocol.dependencyContainer;
    if (
      !container.isRegistered("SettlementContractModule") &&
      // Disable this check for the sequencer
      blockProducerModule === undefined
    ) {
      throw new Error(
        "SettlementContractModule not configured but SettlementCompilerTask is - fix the configuration"
      );
    }
  }

  public getSettlementTargets(): CompilableModule[] {
    // We only care about the BridgeContract for now - later with caching,
    // we might want to expand that to all protocol circuits
    const container = this.protocol.dependencyContainer;
    const settlementModule = container.resolve<
      SettlementContractModule<SettlementModulesRecord>
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
        await reduceSequential<[string, CompilableModule], ArtifactRecord>(
          modules,
          async (record, [moduleName, module]) => {
            log.info(`Compiling ${moduleName}`);
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

    return [sumModule];
  }

  public async getTargets(): Promise<CompilableModule[]> {
    return this.getSettlementTargets();
  }
}
