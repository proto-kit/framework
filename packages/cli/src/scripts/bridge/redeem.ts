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

  const {
    BridgingModule,
    MinaTransactionSender,
    Sequencer,
    SettlementModule,
    AppChain,
  } = await import("@proto-kit/sequencer");
  const { Runtime } = await import("@proto-kit/module");
  const { Protocol } = await import("@proto-kit/protocol");
  const {
    AccountUpdate,
    fetchAccount,
    Field,
    Mina,
    PrivateKey,
    Provable,
    UInt64,
  } = await import("o1js");
  const { FungibleToken } = await import("mina-fungible-token");
  const { DefaultConfigs, DefaultModules } = await import("@proto-kit/stack");
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
