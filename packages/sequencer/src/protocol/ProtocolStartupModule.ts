import { inject } from "tsyringe";
import {
  MandatoryProtocolModulesRecord,
  Protocol,
  VerificationKeyService,
  VKRecord,
} from "@proto-kit/protocol";
import { injectOptional, log } from "@proto-kit/common";

import {
  SequencerModule,
  sequencerModule,
} from "../sequencer/builder/SequencerModule";
import { FlowCreator } from "../worker/flow/Flow";

import { CircuitCompilerTask } from "./production/tasks/CircuitCompilerTask";
import { LocalTaskWorkerModule } from "../worker/worker/LocalTaskWorkerModule";

@sequencerModule()
export class ProtocolStartupModule extends SequencerModule {
  private readonly verificationKeyService: VerificationKeyService;

  public constructor(
    private readonly flowCreator: FlowCreator,
    @inject("Protocol") protocol: Protocol<MandatoryProtocolModulesRecord>,
    private readonly compileTask: CircuitCompilerTask
  ) {
    super();
    this.verificationKeyService = protocol.dependencyContainer.resolve(
      VerificationKeyService
    );
  }

  public async start() {
    const flow = this.flowCreator.createFlow("compile-circuits", {});

    log.info("Compiling Protocol circuits, this can take a few minutes");

    const vks = await flow.withFlow<VKRecord>(async (res, rej) => {
      await flow.pushTask(this.compileTask, undefined, async (result) => {
        res(result);
      });
    });

    log.info("Protocol circuits compiled");

    await this.verificationKeyService.initializeVKTree(vks);
  }
}
