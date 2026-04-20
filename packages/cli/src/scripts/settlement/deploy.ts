import "reflect-metadata";
import { container } from "tsyringe";

import {
  loadEnvironmentVariables,
  getRequiredEnv,
  LoadEnvOptions,
} from "../../utils/loadEnv";
import { loadUserModules } from "../../utils/loadUserModules";

export default async function (options: LoadEnvOptions) {
  try {
    loadEnvironmentVariables(options);
    const { Provable, PublicKey, PrivateKey } = await import("o1js");
    const { Runtime } = await import("@proto-kit/module");
    const { Protocol } = await import("@proto-kit/protocol");
    const {
      AppChain,
      Sequencer,
      SettlementModule,
      InMemoryDatabase,
      BatchProducerModule,
      BridgingModule,
      ConstantFeeStrategy,
      InMemoryMinaSigner,
      MinaBaseLayer,
      PrivateMempool,
      LocalTaskQueue,
      WorkerModule,
      VanillaTaskWorkerModules,
      SequencerStartupModule,
    } = await import("@proto-kit/sequencer");

    const { DefaultConfigs } = await import("@proto-kit/stack");
    const { runtime, protocol } = await loadUserModules();
    const appChain = AppChain.from({
      Runtime: Runtime.from(runtime.modules),
      Protocol: Protocol.from({
        ...protocol.modules,
        ...protocol.settlementModules,
      }),
      Sequencer: Sequencer.from({
        Database: InMemoryDatabase,
        BaseLayer: MinaBaseLayer,
        FeeStrategy: ConstantFeeStrategy,
        BatchProducerModule,
        SettlementModule,
        SettlementSigner: InMemoryMinaSigner,
        BridgingModule,
        Mempool: PrivateMempool,
        TaskQueue: LocalTaskQueue,
<<<<<<< fix/-cli-deploy-script
        LocalTaskWorker: WorkerModule.from(VanillaTaskWorkerModules.allTasks()),
=======
        WorkerModule: WorkerModule.from(VanillaTaskWorkerModules.allTasks()),
>>>>>>> develop
        SequencerStartupModule,
      }),
    });

    appChain.configure({
      Runtime: runtime.config,
      Protocol: {
        ...protocol.config,
        ...protocol.settlementModulesConfig,
      },
      Sequencer: {
        ...DefaultConfigs.inMemoryDatabase(),
        BaseLayer: {
          network: {
            // eslint-disable-next-line max-len
            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions,@typescript-eslint/no-unsafe-assignment
            type: process.env.MINA_NETWORK as any,
            graphql: process.env.MINA_NODE_GRAPHQL!,
            archive: process.env.MINA_ARCHIVE_GRAPHQL!,
            accountManager: process.env.MINA_ACCOUNT_MANAGER_URL!,
          },
        },
        SettlementSigner: {
          feepayer: PrivateKey.fromBase58(
            process.env.PROTOKIT_SEQUENCER_PRIVATE_KEY!
          ),
          contractKeys: [
            PrivateKey.fromBase58(
              process.env.PROTOKIT_SETTLEMENT_CONTRACT_PRIVATE_KEY!
            ),
            PrivateKey.fromBase58(
              process.env.PROTOKIT_DISPATCHER_CONTRACT_PRIVATE_KEY!
            ),
            PrivateKey.fromBase58(
              process.env.PROTOKIT_MINA_BRIDGE_CONTRACT_PRIVATE_KEY!
            ),
          ],
        },
        FeeStrategy: {},
        BatchProducerModule: {},
        SettlementModule: {
          addresses: undefined,
        },
        BridgingModule: {
          addresses: undefined,
        },
        SequencerStartupModule: {},
        TaskQueue: {
          simulatedDuration: 0,
        },
        WorkerModule: VanillaTaskWorkerModules.defaultConfig(),
        Mempool: {},
      },
    });

    const chainContainer = container.createChildContainer();
    const proofsEnabled = process.env.PROTOKIT_PROOFS_ENABLED === "true";
    await appChain.start(proofsEnabled, chainContainer);

    const settlementModule = appChain.sequencer.resolveOrFail(
      "SettlementModule",
      SettlementModule
    );

    console.log("Deploying settlement contracts...");

    await settlementModule.deploy({
      settlementContract: PublicKey.fromBase58(
        getRequiredEnv("PROTOKIT_SETTLEMENT_CONTRACT_PUBLIC_KEY")
      ),
      dispatchContract: PublicKey.fromBase58(
        getRequiredEnv("PROTOKIT_DISPATCHER_CONTRACT_PUBLIC_KEY")
      ),
    });

    Provable.log("Deployed and initialized settlement contracts", {
      settlement: PublicKey.fromBase58(
        getRequiredEnv("PROTOKIT_SETTLEMENT_CONTRACT_PUBLIC_KEY")
      ),
      dispatcher: PublicKey.fromBase58(
        getRequiredEnv("PROTOKIT_DISPATCHER_CONTRACT_PUBLIC_KEY")
      ),
    });

    await appChain.close();
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Cannot find package '@prisma/client-indexer'")
    ) {
      console.error("Error: @prisma/client-indexer not found.");
      console.error(
        "Please run the following command first to generate the Prisma client:"
      );
      console.error("  pnpm prisma:generate");
      process.exit(1);
    }
    throw error;
  }
}
