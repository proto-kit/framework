/* eslint-disable no-console */
/* eslint-disable func-names */
import {
  BridgingModule,
  MinaTransactionSender,
  Sequencer,
  SettlementModule,
  AppChain,
} from "@proto-kit/sequencer";
import { Runtime } from "@proto-kit/module";
import { Protocol } from "@proto-kit/protocol";
import {
  AccountUpdate,
  fetchAccount,
  Field,
  Mina,
  PrivateKey,
  Provable,
  UInt64,
} from "o1js";
import { FungibleToken } from "mina-fungible-token";
import { DefaultConfigs, DefaultModules } from "@proto-kit/stack";

import {
  loadEnvironmentVariables,
  getRequiredEnv,
  LoadEnvOptions,
} from "../../utils/loadEnv";
import { loadUserModules } from "../../utils/loadUserModules";

export interface BridgeRedeemArgs {
  tokenId: string;
  toKey: string;
  amount: number;
}

export default async function (
  options: LoadEnvOptions,
  bridgeArgs?: BridgeRedeemArgs
) {
  if (!bridgeArgs) {
    throw new Error("Bridge redeem arguments required: tokenId, toKey, amount");
  }

  loadEnvironmentVariables(options);
  const { runtime, protocol } = await loadUserModules();
  const tokenId = Field(bridgeArgs.tokenId);
  const toPrivateKey = PrivateKey.fromBase58(
    process.env[bridgeArgs.toKey] ?? bridgeArgs.toKey
  );
  const amount = bridgeArgs.amount * 1e9;
  const fee = 0.1 * 1e9;

  const isCustomToken = tokenId.toBigInt() !== 1n;
  const tokenOwnerPrivateKey = isCustomToken
    ? PrivateKey.fromBase58(getRequiredEnv("PROTOKIT_CUSTOM_TOKEN_PRIVATE_KEY"))
    : PrivateKey.random();

  Provable.log("Preparing to redeem", {
    tokenId,
    to: toPrivateKey.toPublicKey(),
    amount,
    fee,
  });

  const appChain = AppChain.from({
    Runtime: Runtime.from(runtime.modules),
    Protocol: Protocol.from({
      ...protocol.modules,
      ...protocol.settlementModules,
    }),
    Sequencer: Sequencer.from({
      ...DefaultModules.inMemoryDatabase(),
      ...DefaultModules.settlementScript(),
      BridgingModule: BridgingModule
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
      ...DefaultConfigs.settlementScript({
        preset: "development",
      }),
      BridgingModule: {}
    },

  });

  const proofsEnabled = process.env.PROTOKIT_PROOFS_ENABLED === "true";
  await appChain.start(proofsEnabled);

  const bridgingModule = appChain.sequencer.resolveOrFail(
    "BridgingModule",
    BridgingModule
  );

  const bridgeContract = await bridgingModule.getBridgeContract(tokenId);

  const customAcc = await fetchAccount({
    publicKey: toPrivateKey.toPublicKey(),
    tokenId: bridgeContract.deriveTokenId(),
  });

  Provable.log("Custom account", customAcc.account?.balance);

  console.log("Forging transaction...");
  const tx = await Mina.transaction(
    {
      sender: toPrivateKey.toPublicKey(),
      fee,
    },
    async () => {
      const au = AccountUpdate.createSigned(
        toPrivateKey.toPublicKey(),
        tokenId
      );
      au.balance.addInPlace(UInt64.from(amount));

      await bridgeContract.redeem(au);

      if (isCustomToken) {
        await new FungibleToken(
          tokenOwnerPrivateKey.toPublicKey()
        )!.approveAccountUpdate(bridgeContract.self);
      }
    }
  );

  const settlementModule = appChain.sequencer.resolveOrFail(
    "SettlementModule",
    SettlementModule
  );

  settlementModule.utils.signTransaction(tx, {
    signingPublicKeys: [toPrivateKey.toPublicKey()],
    signingWithSignatureCheck: [tokenOwnerPrivateKey.toPublicKey()],
  });

  console.log("Sending...");

  const { hash } = await appChain.sequencer
    .resolveOrFail("TransactionSender", MinaTransactionSender)
    .proveAndSendTransaction(tx, "included");

  console.log(`Redeem transaction included in a block: ${hash}`);
  console.log(tx.toPretty());

  await appChain.close();
}
/* eslint-enable no-console */
/* eslint-enable func-names */
