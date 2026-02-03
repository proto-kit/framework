import { CommandModule } from "yargs";

interface WaitForNetworkArgs {
  "env-path"?: string;
  env?: string[];
}

export const waitForNetworkCommand: CommandModule<{}, WaitForNetworkArgs> = {
  command: "wait",
  describe:
    "Wait for network to be ready\n\nRequires: MINA_NODE_GRAPHQL_HOST, MINA_NODE_GRAPHQL_PORT",
  builder: (yarg) =>
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
  handler: async (args) => {
    try {
      const { default: waitForNetwork } = await import(
        "../../scripts/lightnet/wait-for-network"
      );
      const { parseEnvArgs } = await import("../../utils/loadEnv");
      await waitForNetwork({
        envPath: args["env-path"],
        envVars: parseEnvArgs(args.env ?? []),
      });
      process.exit(0);
    } catch (error) {
      console.error("Failed to wait for network:", error);
      process.exit(1);
    }
  },
};
