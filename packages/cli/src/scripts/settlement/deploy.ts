/* eslint-disable no-console */
/* eslint-disable func-names */

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
    const { Provable, PublicKey } = await import("o1js");
    const { Runtime } = await import("@proto-kit/module");
    const { Protocol } = await import("@proto-kit/protocol");
    const { AppChain, Sequencer, SettlementModule, InMemoryDatabase } =
      await import("@proto-kit/sequencer");
    const { DefaultModules, DefaultConfigs } = await import("@proto-kit/stack");
    loadEnvironmentVariables(options);
    const { runtime, protocol } = await loadUserModules();
    const appChain = AppChain.from({
      Runtime: Runtime.from(runtime.modules),
      Protocol: Protocol.from({
        ...protocol.modules,
        ...protocol.settlementModules,
      }),
      Sequencer: Sequencer.from({
        Database: InMemoryDatabase,
        ...DefaultModules.settlementScript(),
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
        ...DefaultConfigs.settlementScript({ preset: "development" }),
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
/* eslint-enable no-console */
/* eslint-enable func-names */
