/* eslint-disable no-console */
/* eslint-disable func-names */

import { Runtime } from "@proto-kit/module";
import { Protocol } from "@proto-kit/protocol";
import {
  InMemoryDatabase,
  Sequencer,
  SettlementModule,
  AppChain,
  BridgingModule,
} from "@proto-kit/sequencer";
import { Provable, PublicKey } from "o1js";
import "reflect-metadata";
import { container } from "tsyringe";
import { DefaultConfigs, DefaultModules } from "@proto-kit/stack";

import {
  loadEnvironmentVariables,
  getRequiredEnv,
  LoadEnvOptions,
} from "../../utils/loadEnv";
import { loadUserModules } from "../../utils/loadUserModules";

export default async function (options: LoadEnvOptions) {
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
}
/* eslint-enable no-console */
/* eslint-enable func-names */
