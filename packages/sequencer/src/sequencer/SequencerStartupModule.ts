import { inject } from "tsyringe";
import {
  MandatoryProtocolModulesRecord,
  Protocol,
  RuntimeVerificationKeyRootService,
  SettlementSmartContractBase,
} from "@proto-kit/protocol";
import { log } from "@proto-kit/common";

import { FlowCreator } from "../worker/flow/Flow";
import { WorkerRegistrationFlow } from "../worker/worker/startup/WorkerRegistrationFlow";
import {
  CircuitCompilerTask,
  CompiledCircuitsRecord,
} from "../protocol/production/tasks/CircuitCompilerTask";
import { VerificationKeyService } from "../protocol/runtime/RuntimeVerificationKeyService";

import { SequencerModule, sequencerModule } from "./builder/SequencerModule";

@sequencerModule()
export class SequencerStartupModule extends SequencerModule {
  public constructor(
    private readonly flowCreator: FlowCreator,
    @inject("Protocol")
    private readonly protocol: Protocol<MandatoryProtocolModulesRecord>,
    private readonly compileTask: CircuitCompilerTask,
    private readonly verificationKeyService: VerificationKeyService,
    private readonly registrationFlow: WorkerRegistrationFlow
  ) {
    super();
  }

  public async start() {
    const flow = this.flowCreator.createFlow("compile-circuits", {});

    log.info("Compiling Protocol circuits, this can take a few minutes");

    const vks = await flow.withFlow<CompiledCircuitsRecord>(
      async (res, rej) => {
        await flow.pushTask(this.compileTask, undefined, async (result) => {
          res(result);
        });
      }
    );

    log.info("Protocol circuits compiled");

    // Init runtime VK tree
    await this.verificationKeyService.initializeVKTree(vks.runtimeCircuits);

    const root = this.verificationKeyService.getRoot();

    this.protocol.dependencyContainer
      .resolve(RuntimeVerificationKeyRootService)
      .setRoot(root);

    // Init BridgeContract vk for settlement contract
    const bridgeVk = vks.protocolCircuits.BridgeContract;
    if (bridgeVk !== undefined) {
      SettlementSmartContractBase.args.BridgeContractVerificationKey =
        bridgeVk.vk;
    }

    await this.registrationFlow.start({
      runtimeVerificationKeyRoot: root,
      bridgeContractVerificationKey: bridgeVk?.vk,
    });

    log.info("Protocol circuits compiled successfully, commencing startup");
  }
}
