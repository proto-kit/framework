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
} from "@proto-kit/common";

import { Flow, FlowCreator } from "../worker/flow/Flow";
import { WorkerRegistrationFlow } from "../worker/worker/startup/WorkerRegistrationFlow";
import {
  CircuitCompilerTask,
  CompilerTaskParams,
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
    private readonly registrationFlow: WorkerRegistrationFlow,
    private readonly compileRegistry: CompileRegistry
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

  private async compileProtocolAndBridge(flow: Flow<{}>) {
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
          runtimeVKRoot: undefined,
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

    log.info("Compiling Protocol circuits, this can take a few minutes");

    const root = await this.compileRuntime(flow);

    const protocolBridgeArtifacts = await this.compileProtocolAndBridge(flow);

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
    });

    log.info("Protocol circuits compiled successfully, commencing startup");
  }
}
