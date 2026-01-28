#!/usr/bin/env node

/* eslint-disable no-console */
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { parseEnvArgs } from "./utils/loadEnv";

process.removeAllListeners("warning");
process.env.NODE_NO_WARNINGS = "1";

await yargs(hideBin(process.argv))
  .scriptName("proto-kit")
  .usage("$0 <command> [options]")
  .strict()
  .command(
    "generate-gql-docs",
    "Generate GraphQL docs",
    (yarg) =>
      yarg
        .option("port", {
          alias: "p",
          type: "number",
          default: 8080,
          describe: "Port for the GraphQL server if creating an AppChain",
        })
        .option("url", {
          alias: "u",
          type: "string",
          default: "http://localhost:8080/graphql",
          describe: "GraphQL endpoint to use if not starting AppChain",
        })
        .option("empty", {
          alias: "e",
          type: "boolean",
          default: false,
          describe: "Start a new AppChain instead of using existing URL",
        }),
    async (args) => {
      try {
        const { generateGqlDocsCommand } = await import(
          "./scripts/graphqlDocs/generateGqlDocs"
        );
        await generateGqlDocsCommand(args);
        process.exit(0);
      } catch (error) {
        console.error("Failed to start AppChain or generate docs:", error);
        process.exit(1);
      }
    }
  )
  .command(
    "generate-keys [count]",
    "Generate private/public key pairs for development",
    (yarg) =>
      yarg.positional("count", {
        type: "number",
        default: 1,
        describe: "number of keys to generate",
      }),
    async (args) => {
      try {
        const { generateKeysCommand } = await import("./scripts/generateKeys");
        await generateKeysCommand({ count: args.count });
        process.exit(0);
      } catch (error) {
        console.error("Failed to generate keys:", error);
        process.exit(1);
      }
    }
  )
  .command(
    "lightnet:wait-for-network",
    "Wait for lightnet network to be ready\n\nRequires: MINA_NODE_GRAPHQL_HOST, MINA_NODE_GRAPHQL_PORT",
    (yarg) =>
      yarg
        .option("env-path", {
          type: "string",
          describe: "path to .env file",
        })
        .option("env", {
          type: "string",
          array: true,
          describe: "environment variables as KEY=value",
        }),
    async (args) => {
      try {
        const { default: lightnetWaitForNetworkScript } = await import(
          "./scripts/lightnet/wait-for-network"
        );
        await lightnetWaitForNetworkScript({
          envPath: args["env-path"],
          envVars: parseEnvArgs(args.env ?? []),
        });
        process.exit(0);
      } catch (error) {
        console.error("Failed to wait for network:", error);
        process.exit(1);
      }
    }
  )
  .command(
    "lightnet:faucet <publicKey>",
    "Send MINA to an account from the lightnet faucet",
    (yarg) =>
      yarg
        .positional("publicKey", {
          type: "string",
          describe: "public key to send MINA to",
          demandOption: true,
        })
        .option("env-path", {
          type: "string",
          describe: "path to .env file",
        })
        .option("env", {
          type: "string",
          array: true,
          describe: "environment variables as KEY=value",
        }),
    async (args) => {
      try {
        const { default: lightnetFaucetScript } = await import(
          "./scripts/lightnet/faucet"
        );
        await lightnetFaucetScript(args.publicKey);
        process.exit(0);
      } catch (error) {
        console.error("Failed to send funds from faucet:", error);
        process.exit(1);
      }
    }
  )
  .command(
    "settlement:deploy",
    "Deploy settlement contracts\n\nRequires: PROTOKIT_SETTLEMENT_CONTRACT_PRIVATE_KEY, PROTOKIT_DISPATCHER_CONTRACT_PRIVATE_KEY, PROTOKIT_MINA_BRIDGE_CONTRACT_PRIVATE_KEY",
    (yarg) =>
      yarg
        .option("env-path", { type: "string", describe: "path to .env file" })
        .option("env", {
          type: "string",
          array: true,
          describe: "environment variables as KEY=value",
        }),
    async (args) => {
      try {
        const { default: settlementDeployScript } = await import(
          "./scripts/settlement/deploy"
        );
        await settlementDeployScript({
          envPath: args["env-path"],
          envVars: parseEnvArgs(args.env ?? []),
        });
        process.exit(0);
      } catch (error) {
        console.error("Failed to deploy settlement:", error);
        process.exit(1);
      }
    }
  )
  .command(
    "settlement:token:deploy <tokenSymbol> <feepayerKey> <receiverPublicKey> [mintAmount]",
    "Deploy custom fungible token for settlement\n\nRequires: PROTOKIT_SETTLEMENT_CONTRACT_PRIVATE_KEY, PROTOKIT_DISPATCHER_CONTRACT_PRIVATE_KEY, PROTOKIT_CUSTOM_TOKEN_PRIVATE_KEY, PROTOKIT_CUSTOM_TOKEN_ADMIN_PRIVATE_KEY, PROTOKIT_CUSTOM_TOKEN_BRIDGE_PRIVATE_KEY",
    (yarg) =>
      yarg
        .positional("tokenSymbol", { type: "string", demandOption: true })
        .positional("feepayerKey", { type: "string", demandOption: true })
        .positional("receiverPublicKey", {
          type: "string",
          demandOption: true,
        })
        .positional("mintAmount", { type: "number", default: 0 })
        .option("env-path", { type: "string", describe: "path to .env file" })
        .option("env", {
          type: "string",
          array: true,
          describe: "environment variables as KEY=value",
        }),
    async (args) => {
      try {
        const { default: settlementTokenDeployScript } = await import(
          "./scripts/settlement/deploy-token"
        );
        await settlementTokenDeployScript(
          {
            envPath: args["env-path"],
            envVars: parseEnvArgs(args.env ?? []),
          },
          {
            tokenSymbol: args.tokenSymbol,
            feepayerKey: args.feepayerKey,
            receiverPublicKey: args.receiverPublicKey,
            mintAmount: args.mintAmount,
          }
        );
        process.exit(0);
      } catch (error) {
        console.error("Failed to deploy settlement token:", error);
        process.exit(1);
      }
    }
  )
  .command(
    "lightnet:initialize",
    "Initialize lightnet: wait for network, fund accounts, and deploy settlement\n\nRequires: MINA_NODE_GRAPHQL_HOST, MINA_NODE_GRAPHQL_PORT, MINA_ARCHIVE_GRAPHQL_HOST, MINA_ARCHIVE_GRAPHQL_PORT, MINA_ACCOUNT_MANAGER_HOST, MINA_ACCOUNT_MANAGER_PORT, PROTOKIT_SETTLEMENT_CONTRACT_PRIVATE_KEY, PROTOKIT_DISPATCHER_CONTRACT_PRIVATE_KEY, PROTOKIT_MINA_BRIDGE_CONTRACT_PRIVATE_KEY",
    (yarg) =>
      yarg
        .option("env-path", { type: "string", describe: "path to .env file" })
        .option("env", {
          type: "string",
          array: true,
          describe: "environment variables as KEY=value",
        }),
    async (args) => {
      try {
        const { lightnetInitializeCommand } = await import(
          "./scripts/lightnetInitialize"
        );
        await lightnetInitializeCommand({
          envPath: args["env-path"],
          envVars: parseEnvArgs(args.env ?? []),
        });
        process.exit(0);
      } catch (error) {
        console.error("Failed to initialize lightnet:", error);
        process.exit(1);
      }
    }
  )
  .command(
    "bridge:deposit <tokenId> <fromKey> <toKey> <amount>",
    "Deposit tokens to the bridge\n\nRequires: PROTOKIT_CUSTOM_TOKEN_PRIVATE_KEY (for custom tokens), PROTOKIT_CUSTOM_TOKEN_BRIDGE_PRIVATE_KEY, PROTOKIT_MINA_BRIDGE_CONTRACT_PRIVATE_KEY",
    (yarg) =>
      yarg
        .positional("tokenId", { type: "string", demandOption: true })
        .positional("fromKey", { type: "string", demandOption: true })
        .positional("toKey", { type: "string", demandOption: true })
        .positional("amount", { type: "number", demandOption: true })
        .option("env-path", { type: "string", describe: "path to .env file" })
        .option("env", {
          type: "string",
          array: true,
          describe: "environment variables as KEY=value",
        }),
    async (args) => {
      try {
        const { default: bridgeDepositScript } = await import(
          "./scripts/bridge/deposit"
        );
        await bridgeDepositScript(
          {
            envPath: args["env-path"],
            envVars: parseEnvArgs(args.env ?? []),
          },
          {
            tokenId: args.tokenId,
            fromKey: args.fromKey,
            toKey: args.toKey,
            amount: args.amount,
          }
        );
        process.exit(0);
      } catch (error) {
        console.error("Failed to deposit to bridge:", error);
        process.exit(1);
      }
    }
  )
  .command(
    "bridge:redeem <tokenId> <toKey> <amount>",
    "Redeem tokens from the bridge\n\nRequires: PROTOKIT_CUSTOM_TOKEN_PRIVATE_KEY",
    (yarg) =>
      yarg
        .positional("tokenId", { type: "string", demandOption: true })
        .positional("toKey", { type: "string", demandOption: true })
        .positional("amount", { type: "number", demandOption: true })
        .option("env-path", { type: "string", describe: "path to .env file" })
        .option("env", {
          type: "string",
          array: true,
          describe: "environment variables as KEY=value",
        }),
    async (args) => {
      try {
        const { default: bridgeRedeemScript } = await import(
          "./scripts/bridge/redeem"
        );
        await bridgeRedeemScript(
          {
            envPath: args["env-path"],
            envVars: parseEnvArgs(args.env ?? []),
          },
          {
            tokenId: args.tokenId,
            toKey: args.toKey,
            amount: args.amount,
          }
        );
        process.exit(0);
      } catch (error) {
        console.error("Failed to redeem from bridge:", error);
        process.exit(1);
      }
    }
  )
  .command(
    "bridge:withdraw <tokenId> <senderKey> <amount>",
    "Withdraw tokens\n\nRequires: NEXT_PUBLIC_PROTOKIT_GRAPHQL_URL",
    (yarg) =>
      yarg
        .positional("tokenId", { type: "string", demandOption: true })
        .positional("senderKey", { type: "string", demandOption: true })
        .positional("amount", { type: "number", demandOption: true })
        .option("env-path", { type: "string", describe: "path to .env file" })
        .option("env", {
          type: "string",
          array: true,
          describe: "environment variables as KEY=value",
        }),
    async (args) => {
      try {
        const { default: bridgeWithdrawScript } = await import(
          "./scripts/bridge/withdraw"
        );
        await bridgeWithdrawScript(
          {
            envPath: args["env-path"],
            envVars: parseEnvArgs(args.env ?? []),
          },
          {
            tokenId: args.tokenId,
            senderKey: args.senderKey,
            amount: args.amount,
          }
        );
        process.exit(0);
      } catch (error) {
        console.error("Failed to withdraw from bridge:", error);
        process.exit(1);
      }
    }
  )
  .command(
    "env:create",
    "Create a new environment configuration with guided wizard",
    () => ({}),
    async () => {
      try {
        const { default: createEnvironmentScript } = await import(
          "./scripts/env/create-environment"
        );
        await createEnvironmentScript();
        process.exit(0);
      } catch (error) {
        console.error("Failed to create environment:", error);
        process.exit(1);
      }
    }
  )
  .command(
    "explorer:start",
    "Start the explorer UI",
    (yarg) =>
      yarg
        .option("port", {
          alias: "p",
          type: "number",
          default: 5003,
          describe: "port to run the explorer on",
        })
        .option("indexer-url", {
          type: "string",
          describe: "GraphQL endpoint URL for the indexer",
        }),
    async (args) => {
      try {
        const { default: explorerStartScript } = await import(
          "./scripts/explorer/start"
        );
        await explorerStartScript(args.port, args["indexer-url"]);
        process.exit(0);
      } catch (error) {
        console.error("Failed to start explorer:", error);
        process.exit(1);
      }
    }
  )
  .demandCommand(
    1,
    "You must specify a command. Use --help to see available commands."
  )
  .help("help")
  .alias("help", "h")
  .option("help", { describe: "Show help" })
  .strict()
  .parse();
/* eslint-enable no-console */
