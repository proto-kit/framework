import { CommandModule } from "yargs";

import { addEnvironmentOptions } from "../../utils/environmentOptions";

interface WaitForNetworkArgs {
  "env-path"?: string;
  env?: string;
  set?: string[];
}

export const waitForNetworkCommand: CommandModule<{}, WaitForNetworkArgs> = {
  command: "wait",
  describe:
    "Wait for network to be ready\n\nRequires: MINA_NODE_GRAPHQL_HOST, MINA_NODE_GRAPHQL_PORT",
  builder: (yarg) => addEnvironmentOptions(yarg),
  handler: async (args) => {
    try {
      const { default: waitForNetwork } = await import(
        "../../scripts/lightnet/wait-for-network"
      );
      const { parseEnvArgs } = await import("../../utils/loadEnv");
      await waitForNetwork({
        envPath: args["env-path"],
        env: args.env!,
        envVars: parseEnvArgs(args.set ?? []),
      });
      process.exit(0);
    } catch (error) {
      console.error("Failed to wait for network:", error);
      process.exit(1);
    }
  },
};
