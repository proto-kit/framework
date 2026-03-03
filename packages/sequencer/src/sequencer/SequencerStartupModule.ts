import { inject } from "tsyringe";
import {
  BridgingSettlementContractArgs,
  ContractArgsRegistry,
  MandatoryProtocolModulesRecord,
  Protocol,
  RuntimeVerificationKeyRootService,
} from "@proto-kit/protocol";
import {
  log,
  ArtifactRecord,
  ChildVerificationKeyService,
  CompileRegistry,
  AreProofsEnabled,
  CompileArtifact,
} from "@proto-kit/common";

import { Flow, FlowCreator } from "../worker/flow/Flow";
import { WorkerRegistrationFlow } from "../worker/startup/WorkerRegistrationFlow";
import { VerificationKeyService } from "../protocol/runtime/RuntimeVerificationKeyService";
import type { MinaBaseLayer } from "../protocol/baselayer/MinaBaseLayer";
import { NoopBaseLayer } from "../protocol/baselayer/NoopBaseLayer";
import { RuntimeCompileTask } from "../protocol/production/tasks/compile/RuntimeCompileTask";
import { ProtocolCompileTask } from "../protocol/production/tasks/compile/ProtocolCompileTask";
import { SettlementCompileTask } from "../protocol/production/tasks/compile/SettlementCompileTask";
import { CompilerTaskParams } from "../protocol/production/tasks/compile/CircuitCompileTask";
import { Task } from "../worker/flow/Task";

import { SequencerModule, sequencerModule } from "./builder/SequencerModule";
import { Closeable, closeable } from "./builder/Closeable";
import { SettlementModule } from "../settlement/SettlementModule";

@sequencerModule()
@closeable()
export class SequencerStartupModule
  extends SequencerModule
  implements Closeable
{
  public constructor(
    private readonly flowCreator: FlowCreator,
    @inject("Protocol")
    private readonly protocol: Protocol<MandatoryProtocolModulesRecord>,
    private readonly runtimeCompilerTask: RuntimeCompileTask,
    private readonly protocolCompilerTask: ProtocolCompileTask,
    private readonly settlementCompilerTask: SettlementCompileTask,
    private readonly verificationKeyService: VerificationKeyService,
    private readonly registrationFlow: WorkerRegistrationFlow,
    private readonly compileRegistry: CompileRegistry,
    @inject("BaseLayer", { isOptional: true })
    private readonly baseLayer: MinaBaseLayer | undefined,
    @inject("AreProofsEnabled")
    private readonly areProofsEnabled: AreProofsEnabled,
    private readonly contractArgsRegistry: ContractArgsRegistry,
    @inject("SettlementModule", { isOptional: true })
    private readonly settlementModule: SettlementModule | undefined
  ) {
    super();
  }

  private async pushCompileTask(
    flow: Flow<{}>,
    task: Task<CompilerTaskParams, ArtifactRecord>,
    payload: CompilerTaskParams
  ): Promise<ArtifactRecord> {
    return await flow.withFlow<ArtifactRecord>(async (res, rej) => {
      await flow.pushTask(task, payload, async (result) => {
        res(result);
      });
    });
  }

  public async compileRuntime(flow: Flow<{}>) {
    const artifacts = await this.pushCompileTask(
      flow,
      this.runtimeCompilerTask,
      {
        existingArtifacts: {},
        runtimeVKRoot: undefined,
      }
    );

    // Init runtime VK tree
    await this.verificationKeyService.initializeVKTree(artifacts);

    const root = this.verificationKeyService.getRoot();

    this.protocol.dependencyContainer
      .resolve(RuntimeVerificationKeyRootService)
      .setRoot(root);

    this.compileRegistry.addArtifactsRaw(artifacts);

    return root;
  }

  private async compileBridge(flow: Flow<{}>, isSignedSettlement?: boolean) {
    const result = await flow.withFlow<ArtifactRecord>(async (res, rej) => {
      await flow.pushTask(
        this.settlementCompilerTask,
        {
          existingArtifacts: this.compileRegistry.getAllArtifacts(),
          runtimeVKRoot: undefined,
          isSignedSettlement,
        },
        async (bridgeResult) => {
          res(bridgeResult);
        }
      );
    });
    this.compileRegistry.addArtifactsRaw(result);
    return result;
  }

  private async compileProtocol(flow: Flow<{}>, runtimeVkTreeRoot: bigint) {
    const result = await flow.withFlow<ArtifactRecord>(async (res, rej) => {
      await flow.pushTask(
        this.protocolCompilerTask,
        {
          existingArtifacts: this.compileRegistry.getAllArtifacts(),
          runtimeVKRoot: runtimeVkTreeRoot.toString(),
        },
        async (protocolResult) => {
          res(protocolResult);
        }
      );
    });
    this.compileRegistry.addArtifactsRaw(result);
    return result;
  }

  public async start() {
    const flow = this.flowCreator.createFlow("compile-circuits", {});

    this.protocol.dependencyContainer
      .resolve(ChildVerificationKeyService)
      .setCompileRegistry(this.compileRegistry);

    const isSignedSettlement =
      this.baseLayer && !(this.baseLayer instanceof NoopBaseLayer)
        ? this.baseLayer.isSignedSettlement()
        : undefined;

    log.info("Compiling Protocol circuits, this can take a few minutes");

    const timeout = setTimeout(
      () => {
        log.error(
          "No response yet received from workers - have you configured a TaskQueue and a corresponding worker running (either in-process or somewhere else)"
        );
      },
      this.areProofsEnabled.areProofsEnabled ? 20 * 60 * 1000 : 30 * 1000
    );

    const root = await this.compileRuntime(flow);

    await this.compileProtocol(flow, root);

    let bridgeVk: CompileArtifact | undefined = undefined;

    if (this.settlementModule !== undefined) {
      const bridgeArtifacts = await this.compileBridge(
        flow,
        isSignedSettlement
      );

      // TODO Why is this not in SettlementStartupModule?
      // Init BridgeContract vk for settlement contract
      bridgeVk = bridgeArtifacts.BridgeContract;
      if (bridgeVk !== undefined) {
        // TODO Inject CompileRegistry directly
        this.contractArgsRegistry.addArgs<BridgingSettlementContractArgs>(
          "SettlementContract",
          {
            BridgeContractVerificationKey: bridgeVk.verificationKey,
          }
        );
      }
    }

    log.info("Protocol circuits compiled");

    await this.registrationFlow.start({
      runtimeVerificationKeyRoot: root,
      bridgeContractVerificationKey: bridgeVk?.verificationKey,
      compiledArtifacts: this.compileRegistry.getAllArtifacts(),
      isSignedSettlement,
    });

    log.info("Protocol circuits compiled successfully, commencing startup");

    clearTimeout(timeout);
  }

  public async close() {
    await this.registrationFlow.close();
  }
}
