/* eslint-disable no-inner-declarations */

import { DispatchSmartContract } from "@proto-kit/protocol";
import { PrismaRedisDatabase } from "@proto-kit/persistance";
import "reflect-metadata";
import { container } from "tsyringe";

import {
  getRequiredEnv,
  loadEnvironmentVariables,
  LoadEnvOptions,
} from "../../utils/loadEnv";
import { loadUserModules } from "../../utils/loadUserModules";

export interface TokenDeployArgs {
  tokenSymbol: string;
  feepayerKey: string;
  receiverPublicKey: string;
  mintAmount: number;
}

export default async function (
  options: LoadEnvOptions,
  tokenArgs?: TokenDeployArgs
) {
  try {
    if (!tokenArgs) {
      throw new Error(
        "Token deployment arguments required: tokenSymbol, feepayerKey, receiverPublicKey, [mintAmount]"
      );
    }
    loadEnvironmentVariables(options);
    const { scriptModules, scriptModulesConfig } =
      await import("../../utils/modules");

    const { Runtime } = await import("@proto-kit/module");
    const { Protocol } = await import("@proto-kit/protocol");
    const {
      ArchiveNode,
      MinaTransactionSender,
      ProvenSettlementPermissions,
      Sequencer,
      SettlementModule,
      SignedSettlementPermissions,
      AppChain,
      BridgingModule,
    } = await import("@proto-kit/sequencer");
    const {
      AccountUpdate,
      Bool,
      fetchAccount,
      Mina,
      PrivateKey,
      Provable,
      PublicKey,
      UInt64,
      UInt8,
    } = await import("o1js");
    const { FungibleToken, FungibleTokenAdmin } =
      await import("mina-fungible-token");

    const { runtime, protocol } = await loadUserModules();
    const appChain = AppChain.from({
      Runtime: Runtime.from(runtime.modules),
      Protocol: Protocol.from({
        ...protocol.modules,
        ...protocol.settlementModules,
      }),
      Sequencer: Sequencer.from({
        Database: PrismaRedisDatabase,
        ...scriptModules,
      }),
    });

    appChain.configure({
      Runtime: runtime.config,
      Protocol: {
        ...protocol.config,
        ...protocol.settlementModulesConfig,
      },
      Sequencer: {
        Database: {
          redis: {
            host: getRequiredEnv("REDIS_HOST"),
            port: Number(getRequiredEnv("REDIS_PORT")),
            password: getRequiredEnv("REDIS_PASSWORD"),
          },
          prisma: {
            connection: getRequiredEnv("DATABASE_URL"),
          },
          pruneOnStartup: false,
        },
        ...scriptModulesConfig,
      },
    });

    const chainContainer = container.createChildContainer();
    const proofsEnabled = process.env.PROTOKIT_PROOFS_ENABLED === "true";
    await appChain.start(proofsEnabled, chainContainer);
    const { tokenSymbol } = tokenArgs;
    const feepayerPrivateKey = PrivateKey.fromBase58(
      process.env[tokenArgs.feepayerKey] ?? tokenArgs.feepayerKey
    );
    const receiverPublicKey = PublicKey.fromBase58(
      process.env[tokenArgs.receiverPublicKey] ?? tokenArgs.receiverPublicKey
    );
    const mintAmount = tokenArgs.mintAmount * 1e9;
    const fee = 0.1 * 1e9;

    const settlementModule = appChain.sequencer.resolveOrFail(
      "SettlementModule",
      SettlementModule
    );

    const bridgingModule = appChain.sequencer.resolveOrFail(
      "BridgingModule",
      BridgingModule
    );

    const isSignedSettlement = settlementModule.utils.isSignedSettlement();

    const tokenOwnerKey = PrivateKey.fromBase58(
      process.env.PROTOKIT_CUSTOM_TOKEN_PRIVATE_KEY ??
        PrivateKey.random().toBase58()
    );
    const tokenAdminKey = PrivateKey.fromBase58(
      process.env.PROTOKIT_CUSTOM_TOKEN_ADMIN_PRIVATE_KEY ??
        PrivateKey.random().toBase58()
    );
    const tokenBridgeKey = PrivateKey.fromBase58(
      process.env.PROTOKIT_CUSTOM_TOKEN_BRIDGE_PRIVATE_KEY ??
        PrivateKey.random().toBase58()
    );

    await ArchiveNode.waitOnSync(
      appChain.sequencer.resolve("BaseLayer").config
    );

    async function deployTokenContracts() {
      const permissions = isSignedSettlement
        ? new SignedSettlementPermissions()
        : new ProvenSettlementPermissions();

      const tx = await Mina.transaction(
        {
          sender: feepayerPrivateKey.toPublicKey(),
          memo: "Deploy custom token",
          fee,
        },
        async () => {
          AccountUpdate.fundNewAccount(feepayerPrivateKey.toPublicKey(), 3);

          const admin = new FungibleTokenAdmin(tokenAdminKey.toPublicKey());
          await admin.deploy({
            adminPublicKey: feepayerPrivateKey.toPublicKey(),
          });
          admin.self.account.permissions.set(permissions.bridgeContractToken());

          const fungibleToken = new FungibleToken(tokenOwnerKey.toPublicKey());
          await fungibleToken.deploy({
            src: "",
            symbol: tokenSymbol,
            allowUpdates: false,
          });
          fungibleToken!.self.account.permissions.set(
            permissions.bridgeContractToken()
          );

          await fungibleToken.initialize(
            tokenAdminKey.toPublicKey(),
            UInt8.from(9),
            Bool(false)
          );
        }
      );
      console.log("Sending deploy transaction...");
      console.log(tx.toPretty());

      settlementModule.utils.signTransaction(tx, {
        signingWithSignatureCheck: [
          tokenOwnerKey.toPublicKey(),
          tokenAdminKey.toPublicKey(),
        ],
        signingPublicKeys: [feepayerPrivateKey.toPublicKey()],
      });

      await appChain.sequencer
        .resolveOrFail("TransactionSender", MinaTransactionSender)
        .proveAndSendTransaction(tx, "included");

      console.log("Deploy transaction included");
    }

    async function mint() {
      const tokenOwner = new FungibleToken(tokenOwnerKey.toPublicKey());
      await settlementModule.utils.fetchContractAccounts(
        {
          address: tokenOwner!.address,
          tokenId: tokenOwner!.tokenId,
        },
        {
          address: tokenOwner!.address,
          tokenId: tokenOwner!.deriveTokenId(),
        }
      );

      const tx = await Mina.transaction(
        {
          sender: feepayerPrivateKey.toPublicKey(),
          memo: "Mint custom token",
          fee,
        },
        async () => {
          AccountUpdate.fundNewAccount(feepayerPrivateKey.toPublicKey(), 1);

          await tokenOwner!.mint(receiverPublicKey, UInt64.from(mintAmount));
        }
      );

      settlementModule.utils.signTransaction(tx, {
        signingPublicKeys: [feepayerPrivateKey.toPublicKey()],
        signingWithSignatureCheck: [
          tokenOwnerKey.toPublicKey(),
          tokenAdminKey.toPublicKey(),
        ],
      });

      await appChain.sequencer
        .resolveOrFail("TransactionSender", MinaTransactionSender)
        .proveAndSendTransaction(tx, "included");
    }

    async function deployBridge() {
      const settlement = settlementModule.getSettlementContract();

      const dispatch =
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        bridgingModule.getDispatchContract() as DispatchSmartContract;

      await fetchAccount({
        publicKey: settlementModule.utils.getSigner(),
      });
      await fetchAccount({ publicKey: settlement.address });
      await fetchAccount({ publicKey: dispatch.address });

      const tokenOwner = new FungibleToken(tokenOwnerKey.toPublicKey());
      // SetAdminEvent.
      await bridgingModule.deployTokenBridge(
        tokenOwner,
        tokenBridgeKey.toPublicKey(),
        {}
      );
      console.log(
        `Token bridge address: ${tokenBridgeKey.toPublicKey().toBase58()} @ ${tokenOwner.deriveTokenId().toString()}`
      );
    }

    await deployTokenContracts();
    await mint();
    await deployBridge();

    console.log(
      `Deployed custom token with id ${new FungibleToken(tokenOwnerKey.toPublicKey())!.deriveTokenId()}`
    );

    Provable.log("Deployed and initialized settlement contracts", {
      settlement: PrivateKey.fromBase58(
        getRequiredEnv("PROTOKIT_SETTLEMENT_CONTRACT_PRIVATE_KEY")
      ).toPublicKey(),
      dispatcher: PrivateKey.fromBase58(
        getRequiredEnv("PROTOKIT_DISPATCHER_CONTRACT_PRIVATE_KEY")
      ).toPublicKey(),
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
/* eslint-enable no-inner-declarations */
