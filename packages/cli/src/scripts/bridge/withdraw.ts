/* eslint-disable no-console */
/* eslint-disable func-names */
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

  const { ClientAppChain, InMemorySigner } = await import("@proto-kit/sdk");
  const { Field, PrivateKey, Provable } = await import("o1js");
  const { UInt64 } = await import("@proto-kit/library");
  const { Runtime } = await import("@proto-kit/module");
  const { Protocol } = await import("@proto-kit/protocol");

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
/* eslint-enable no-console */
/* eslint-enable func-names */
