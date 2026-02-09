import { ClientAppChain, InMemorySigner } from "@proto-kit/sdk";
import { Field, PrivateKey, Provable } from "o1js";
import { UInt64 } from "@proto-kit/library";
import { Runtime } from "@proto-kit/module";
import { Protocol } from "@proto-kit/protocol";

import { loadEnvironmentVariables, LoadEnvOptions } from "../../utils/loadEnv";
import { loadUserModules } from "../../utils/loadUserModules";

export interface BridgeWithdrawArgs {
  tokenId: string;
  senderKey: string;
  amount: number;
}

export default async function (
  options: LoadEnvOptions,
  bridgeArgs?: BridgeWithdrawArgs
) {
  if (!bridgeArgs) {
    throw new Error(
      "Bridge withdraw arguments required: tokenId, senderKey, amount"
    );
  }

  loadEnvironmentVariables(options);
  const { runtime, protocol } = await loadUserModules();
  const tokenId = Field(bridgeArgs.tokenId);
  const amount = UInt64.from(bridgeArgs.amount * 1e9);
  const appChain = ClientAppChain.fromRemoteEndpoint(
    Runtime.from(runtime.modules),
    Protocol.from({ ...protocol.modules, ...protocol.settlementModules }),
    InMemorySigner
  );

  appChain.configurePartial({
    Runtime: runtime.config,
    Protocol: {
      ...protocol.config,
      ...protocol.settlementModulesConfig,
    },
    GraphqlClient: {
      url: process.env.NEXT_PUBLIC_PROTOKIT_GRAPHQL_URL,
    },
  });

  await appChain.start();

  const senderPrivateKey = PrivateKey.fromBase58(
    process.env[bridgeArgs.senderKey] ?? bridgeArgs.senderKey
  );
  const senderPublicKey = senderPrivateKey.toPublicKey();
  const signer = appChain.resolve("Signer");
  signer.config.signer = senderPrivateKey;

  Provable.log("debug", {
    senderPrivateKey,
    senderPublicKey,
    amount,
    tokenId,
  });

  const withdrawals = appChain.runtime.resolve("Withdrawals");
  const tx = await appChain.transaction(senderPublicKey, async () => {
    await withdrawals.withdraw(senderPublicKey, amount, tokenId);
  });

  await tx.sign();
  await tx.send();

  console.log("withdrawal tx sent");

  await appChain.close();
}
