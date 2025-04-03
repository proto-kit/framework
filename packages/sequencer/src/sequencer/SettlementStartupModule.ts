import { injectable } from "tsyringe";
import {
  ArtifactRecord,
  CompileArtifact,
  CompileRegistry,
  log,
} from "@proto-kit/common";

import { FlowCreator } from "../worker/flow/Flow";
import { CircuitCompilerTask } from "../protocol/production/tasks/CircuitCompilerTask";

@injectable()
export class SettlementStartupModule {
  public constructor(
    private readonly compileRegistry: CompileRegistry,
    private readonly flowCreator: FlowCreator,
    private readonly compileTask: CircuitCompilerTask
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
          targets: ["Settlement"],
          runtimeVKRoot: undefined,
        },
        async (result) => res(result)
      );
    });
    this.compileRegistry.addArtifactsRaw(artifacts);
    return artifacts;
  }

  private async getArtifacts(retry: boolean): Promise<{
    SettlementSmartContract: CompileArtifact;
    DispatchSmartContract: CompileArtifact;
  }> {
    const settlementVerificationKey = this.compileRegistry.getArtifact(
      "SettlementSmartContract"
    );
    const dispatchVerificationKey = this.compileRegistry.getArtifact(
      "DispatchSmartContract"
    );

    if (
      settlementVerificationKey === undefined ||
      dispatchVerificationKey === undefined
    ) {
      if (!retry) {
        log.info(
          "Settlement Contracts not yet compiled, initializing compilation"
        );
        await this.compile();
        return await this.getArtifacts(true);
      }
      throw new Error(
        "Settlement contract verification keys not available for deployment"
      );
    }

    return {
      SettlementSmartContract: settlementVerificationKey,
      DispatchSmartContract: dispatchVerificationKey,
    };
  }

  public async retrieveVerificationKeys() {
    return await this.getArtifacts(false);
  }
}
