import { DispatchSmartContract } from "@proto-kit/protocol";

import {
  loadEnvironmentVariables,
  getRequiredEnv,
  LoadEnvOptions,
} from "../../utils/loadEnv";
import { loadUserModules } from "../../utils/loadUserModules";

export interface BridgeDepositArgs {
  tokenId: string;
  fromKey: string;
  toKey: string;
  amount: number;
}

export default async function (
  options: LoadEnvOptions,
  bridgeArgs?: BridgeDepositArgs
) {
  if (!bridgeArgs) {
    throw new Error(
      "Bridge deposit arguments required: tokenId, fromKey, toKey, amount"
    );
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
  const { DefaultConfigs, DefaultModules } = await import("@proto-kit/stack");
  const {
    AccountUpdate,
    fetchAccount,
    Field,
    Mina,
    PrivateKey,
    Provable,
    PublicKey,
    UInt64,
  } = await import("o1js");
  const { FungibleToken } = await import("mina-fungible-token");

  const { runtime, protocol } = await loadUserModules();
  const tokenId = Field(bridgeArgs.tokenId);
  const fromPrivateKey = PrivateKey.fromBase58(
    process.env[bridgeArgs.fromKey] ?? bridgeArgs.fromKey
  );
  const toPublicKey = PublicKey.fromBase58(
    process.env[bridgeArgs.toKey] ?? bridgeArgs.toKey
  );
  const amount = bridgeArgs.amount * 1e9;
  const fee = 0.1 * 1e9;

  const isCustomToken = tokenId.toBigInt() !== 1n;
  const tokenOwnerPrivateKey = isCustomToken
    ? PrivateKey.fromBase58(getRequiredEnv("PROTOKIT_CUSTOM_TOKEN_PRIVATE_KEY"))
    : PrivateKey.random();
  const bridgeContractKey = isCustomToken
    ? PrivateKey.fromBase58(
        getRequiredEnv("PROTOKIT_CUSTOM_TOKEN_BRIDGE_PRIVATE_KEY")
      )
    : PrivateKey.fromBase58(
        getRequiredEnv("PROTOKIT_MINA_BRIDGE_CONTRACT_PRIVATE_KEY")
      );

  Provable.log("Preparing to deposit", {
    tokenId,
    fromPrivateKey,
    toPublicKey,
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

  const settlementModule = appChain.sequencer.resolveOrFail(
    "SettlementModule",
    SettlementModule
  );

  const bridgingModule = appChain.sequencer.resolveOrFail(
    "BridgingModule",
    BridgingModule
  );

  const settlement = settlementModule.getSettlementContract();
  const dispatch =
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    bridgingModule.getDispatchContract() as DispatchSmartContract;

  await fetchAccount({ publicKey: fromPrivateKey.toPublicKey() });
  await fetchAccount({ publicKey: settlement.address });
  await fetchAccount({ publicKey: dispatch.address });
  const bridgeAddress = await bridgingModule.getBridgeAddress(tokenId);
  await fetchAccount({ publicKey: bridgeAddress!, tokenId: tokenId });
  await fetchAccount({ publicKey: bridgeAddress!, tokenId: tokenId });

  const attestation =
    await bridgingModule.getDepositContractAttestation(tokenId);

  console.log("Forging transaction...");
  const tx = await Mina.transaction(
    {
      memo: "User deposit",
      sender: fromPrivateKey.toPublicKey(),
      fee,
    },
    async () => {
      const au = AccountUpdate.createSigned(
        fromPrivateKey.toPublicKey(),
        tokenId
      );
      au.balance.subInPlace(UInt64.from(amount));

      await dispatch.deposit(
        UInt64.from(amount),
        tokenId,
        bridgeContractKey.toPublicKey(),
        attestation,
        toPublicKey
      );

      if (isCustomToken) {
        await new FungibleToken(
          tokenOwnerPrivateKey.toPublicKey()
        )!.approveAccountUpdates([au, dispatch.self]);
      }
    }
  );
  console.log(tx.toPretty());

  settlementModule.utils.signTransaction(tx, {
    signingPublicKeys: [fromPrivateKey.toPublicKey()],
    preventNoncePreconditionFor: [dispatch.address],
    signingWithSignatureCheck: [tokenOwnerPrivateKey.toPublicKey()],
  });

  console.log("Sending...");
  console.log(tx.toPretty());

  const { hash } = await appChain.sequencer
    .resolveOrFail("TransactionSender", MinaTransactionSender)
    .proveAndSendTransaction(tx, "included");

  console.log(`Deposit transaction included in a block: ${hash}`);

  await appChain.close();
}
