import { CommandModule } from "yargs";

import { addEnvironmentOptions } from "../../utils/environmentOptions";

interface InitializeArgs {
  "env-path"?: string;
  env?: string;
  set?: string[];
}

export const initializeCommand: CommandModule<{}, InitializeArgs> = {
  command: "initialize",
  describe:
    "Initialize lightnet: wait for network, fund accounts, and deploy settlement\n\nRequires: MINA_NODE_GRAPHQL, MINA_ARCHIVE_GRAPHQL, MINA_ACCOUNT_MANAGER_URL, PROTOKIT_SETTLEMENT_CONTRACT_PRIVATE_KEY, PROTOKIT_DISPATCHER_CONTRACT_PRIVATE_KEY, PROTOKIT_MINA_BRIDGE_CONTRACT_PRIVATE_KEY",
  builder: (yarg) => addEnvironmentOptions(yarg),
  handler: async (args) => {
    try {
      const { default: lightnetInitialize } =
        await import("../../scripts/lightnet/lightnetInitialize");
      const { parseEnvArgs } = await import("../../utils/loadEnv");
      await lightnetInitialize({
        envPath: args["env-path"],
        env: args.env!,
        envVars: parseEnvArgs(args.set ?? []),
      });
      process.exit(0);
    } catch (error) {
      console.error("Failed to initialize lightnet:", error);
      process.exit(1);
    }
  },
};
