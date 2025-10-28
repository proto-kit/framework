import { inject } from "tsyringe";
import {
  MandatoryProtocolModulesRecord,
  Protocol,
  RuntimeVerificationKeyRootService,
  SettlementSmartContractBase,
} from "@proto-kit/protocol";
import {
  log,
  ArtifactRecord,
  ChildVerificationKeyService,
  CompileRegistry,
  AreProofsEnabled,
} from "@proto-kit/common";

import { Flow, FlowCreator } from "../worker/flow/Flow";
import { WorkerRegistrationFlow } from "../worker/worker/startup/WorkerRegistrationFlow";
import {
  CircuitCompilerTask,
  CompilerTaskParams,
} from "../protocol/production/tasks/CircuitCompilerTask";
import { VerificationKeyService } from "../protocol/runtime/RuntimeVerificationKeyService";
import type { MinaBaseLayer } from "../protocol/baselayer/MinaBaseLayer";
import { SettlementUtils } from "../settlement/utils/SettlementUtils";
import { NoopBaseLayer } from "../protocol/baselayer/NoopBaseLayer";

import { SequencerModule, sequencerModule } from "./builder/SequencerModule";
import { Closeable, closeable } from "./builder/Closeable";

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
    private readonly compileTask: CircuitCompilerTask,
    private readonly verificationKeyService: VerificationKeyService,
    private readonly registrationFlow: WorkerRegistrationFlow,
    private readonly compileRegistry: CompileRegistry,
    @inject("BaseLayer", { isOptional: true })
    private readonly baseLayer: MinaBaseLayer | undefined,
    @inject("AreProofsEnabled")
    private readonly areProofsEnabled: AreProofsEnabled
  ) {
    super();
  }

  private async pushCompileTask(
    flow: Flow<{}>,
    payload: CompilerTaskParams
  ): Promise<ArtifactRecord> {
    return await flow.withFlow<ArtifactRecord>(async (res, rej) => {
      await flow.pushTask(this.compileTask, payload, async (result) => {
        res(result);
      });
    });
  }

  public async compileRuntime(flow: Flow<{}>) {
    const artifacts = await this.pushCompileTask(flow, {
      existingArtifacts: {},
      targets: ["runtime"],
      runtimeVKRoot: undefined,
    });

    // Init runtime VK tree
    await this.verificationKeyService.initializeVKTree(artifacts);

    const root = this.verificationKeyService.getRoot();

    this.protocol.dependencyContainer
      .resolve(RuntimeVerificationKeyRootService)
      .setRoot(root);

    this.compileRegistry.addArtifactsRaw(artifacts);

    return root;
  }

  private async compileProtocolAndBridge(
    flow: Flow<{}>,
    runtimeVkTreeRoot: bigint,
    isSignedSettlement?: boolean
  ) {
    // Can happen in parallel
    type ParallelResult = {
      protocol?: ArtifactRecord;
      bridge?: ArtifactRecord;
    };

    const result = await flow.withFlow<ArtifactRecord>(async (res, rej) => {
      const results: ParallelResult = {};

      const resolveIfPossible = () => {
        const { bridge, protocol } = results;
        if (bridge !== undefined && protocol !== undefined) {
          res({ ...protocol, ...bridge });
        }
      };

      await flow.pushTask(
        this.compileTask,
        {
          existingArtifacts: {},
          targets: ["protocol"],
          runtimeVKRoot: runtimeVkTreeRoot.toString(),
        },
        async (protocolResult) => {
          results.protocol = protocolResult;
          resolveIfPossible();
        }
      );

      await flow.pushTask(
        this.compileTask,
        {
          existingArtifacts: {},
          targets: ["Settlement.BridgeContract"],
          runtimeVKRoot: undefined,
          isSignedSettlement,
        },
        async (bridgeResult) => {
          results.bridge = bridgeResult;
          resolveIfPossible();
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

    // TODO Find a way to generalize this or at least make it nicer - too much logic here
    const isSignedSettlement =
      this.baseLayer !== undefined && !(this.baseLayer instanceof NoopBaseLayer)
        ? new SettlementUtils(
            this.areProofsEnabled,
            this.baseLayer
          ).isSignedSettlement()
        : undefined;

    log.info("Compiling Protocol circuits, this can take a few minutes");

    const root = await this.compileRuntime(flow);

    const protocolBridgeArtifacts = await this.compileProtocolAndBridge(
      flow,
      root,
      isSignedSettlement
    );

    log.info("Protocol circuits compiled");

    // Init BridgeContract vk for settlement contract
    const bridgeVk = protocolBridgeArtifacts.BridgeContract;
    if (bridgeVk !== undefined) {
      SettlementSmartContractBase.args.BridgeContractVerificationKey =
        bridgeVk.verificationKey;
    }

    await this.registrationFlow.start({
      runtimeVerificationKeyRoot: root,
      bridgeContractVerificationKey: bridgeVk?.verificationKey,
      compiledArtifacts: this.compileRegistry.getAllArtifacts(),
      isSignedSettlement,
    });

    log.info("Protocol circuits compiled successfully, commencing startup");
  }

  public async close() {
    await this.registrationFlow.close();
  }
}
