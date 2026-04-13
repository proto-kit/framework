import { injectable } from "tsyringe";
import {
  ArtifactRecord,
  CompileArtifact,
  CompileRegistry,
  log,
} from "@proto-kit/common";

import { FlowCreator } from "../worker/flow/Flow";
import { SettlementCompileTask } from "../protocol/production/tasks/compile/SettlementCompileTask";

@injectable()
export class SettlementStartupModule {
  // TODO Why is this a separate module?
  public constructor(
    private readonly compileRegistry: CompileRegistry,
    private readonly flowCreator: FlowCreator,
    private readonly compileTask: SettlementCompileTask
  ) {}

  // TODO Compile only individual contracts - this however runs into the
  //  unlinkability issue from module name to artifact name
  //  although - the settlement proving task currently also only works if
  //  all contracts that a tx touches are compiled on that worker instance
  private async compile() {
    const flow = this.flowCreator.createFlow("compile-deploy", {});
    const artifacts = await flow.withFlow<ArtifactRecord>(async (res) => {
      await flow.pushTask(
        this.compileTask,
        {
          existingArtifacts: this.compileRegistry.getAllArtifacts(),
          runtimeVKRoot: undefined,
        },
        async (result) => res(result)
      );
    });
    this.compileRegistry.addArtifactsRaw(artifacts);
    return artifacts;
  }

  private async getArtifacts<Contracts extends Record<string, true>>(
    contracts: Contracts,
    retry: boolean
  ): Promise<Record<keyof Contracts, CompileArtifact>> {
    const artifacts = Object.entries(contracts).map(
      ([contract]) =>
        [contract, this.compileRegistry.getArtifact(contract)] as const
    );

    if (artifacts.some((x) => x[1] === undefined)) {
      if (retry) {
        log.info(
          "Settlement Contracts not yet compiled, initializing compilation"
        );
        await this.compile();
        return await this.getArtifacts(contracts, false);
      }
      throw new Error(
        "Settlement contract verification keys not available for deployment"
      );
    }

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return Object.fromEntries(artifacts) as Record<
      keyof Contracts,
      CompileArtifact
    >;
  }

  public async retrieveVerificationKeys<Contracts extends Record<string, true>>(
    contracts: Contracts
  ) {
    return await this.getArtifacts(contracts, true);
  }
}
