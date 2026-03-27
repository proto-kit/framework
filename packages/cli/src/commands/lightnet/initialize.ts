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
    "Initialize lightnet: wait for network, fund accounts, and deploy settlement\n\nRequires: MINA_NODE_GRAPHQL_HOST, MINA_NODE_GRAPHQL_PORT, MINA_ARCHIVE_GRAPHQL_HOST, MINA_ARCHIVE_GRAPHQL_PORT, MINA_ACCOUNT_MANAGER_HOST, MINA_ACCOUNT_MANAGER_PORT, PROTOKIT_SEQUENCER_PUBLIC_KEY, TEST_ACCOUNT_1_PUBLIC_KEY, PROTOKIT_SETTLEMENT_CONTRACT_PUBLIC_KEY, PROTOKIT_DISPATCHER_CONTRACT_PUBLIC_KEY",
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
