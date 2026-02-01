import { CommandModule } from "yargs";

interface InitializeArgs {
  "env-path"?: string;
  env?: string[];
}

export const initializeCommand: CommandModule<{}, InitializeArgs> = {
  command: "initialize",
  describe:
    "Initialize lightnet: wait for network, fund accounts, and deploy settlement\n\nRequires: MINA_NODE_GRAPHQL_HOST, MINA_NODE_GRAPHQL_PORT, MINA_ARCHIVE_GRAPHQL_HOST, MINA_ARCHIVE_GRAPHQL_PORT, MINA_ACCOUNT_MANAGER_HOST, MINA_ACCOUNT_MANAGER_PORT, PROTOKIT_SETTLEMENT_CONTRACT_PRIVATE_KEY, PROTOKIT_DISPATCHER_CONTRACT_PRIVATE_KEY, PROTOKIT_MINA_BRIDGE_CONTRACT_PRIVATE_KEY",
  builder: (yarg) =>
    yarg
      .option("env-path", { type: "string", describe: "path to .env file" })
      .option("env", {
        type: "string",
        array: true,
        describe: "environment variables as KEY=value",
      }),
  handler: async (args) => {
    try {
      const { default: lightnetInitialize } = await import(
        "../../scripts/lightnetInitialize"
      );
      const { parseEnvArgs } = await import("../../utils/loadEnv");
      await lightnetInitialize({
        envPath: args["env-path"],
        envVars: parseEnvArgs(args.env ?? []),
      });
      process.exit(0);
    } catch (error) {
      console.error("Failed to initialize lightnet:", error);
      process.exit(1);
    }
  },
};
