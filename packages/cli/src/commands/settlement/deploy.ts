import { CommandModule } from "yargs";

import { addEnvironmentOptions } from "../../utils/environmentOptions";

interface DeployArgs {
  "env-path"?: string;
  env?: string;
  set?: string[];
}

export const deployCommand: CommandModule<{}, DeployArgs> = {
  command: "deploy",
  describe:
    "Deploy settlement contracts\n\nRequires: PROTOKIT_SETTLEMENT_CONTRACT_PRIVATE_KEY, PROTOKIT_DISPATCHER_CONTRACT_PRIVATE_KEY, PROTOKIT_MINA_BRIDGE_CONTRACT_PRIVATE_KEY",
  builder: (yarg) => addEnvironmentOptions(yarg),
  handler: async (args) => {
    try {
      const { default: deploy } = await import(
        "../../scripts/settlement/deploy"
      );
      const { parseEnvArgs } = await import("../../utils/loadEnv");
      await deploy({
        envPath: args["env-path"],
        env: args.env!,
        envVars: parseEnvArgs(args.set ?? []),
      });
      process.exit(0);
    } catch (error) {
      console.error("Failed to deploy settlement:", error);
      process.exit(1);
    }
  },
};
