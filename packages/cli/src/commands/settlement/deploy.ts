import { CommandModule } from "yargs";

interface DeployArgs {
  "env-path"?: string;
  env?: string[];
}

export const deployCommand: CommandModule<{}, DeployArgs> = {
  command: "deploy",
  describe:
    "Deploy settlement contracts\n\nRequires: PROTOKIT_SETTLEMENT_CONTRACT_PRIVATE_KEY, PROTOKIT_DISPATCHER_CONTRACT_PRIVATE_KEY, PROTOKIT_MINA_BRIDGE_CONTRACT_PRIVATE_KEY",
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
      const { default: deploy } = await import(
        "../../scripts/settlement/deploy"
      );
      const { parseEnvArgs } = await import("../../utils/loadEnv");
      await deploy({
        envPath: args["env-path"],
        envVars: parseEnvArgs(args.env ?? []),
      });
      process.exit(0);
    } catch (error) {
      console.error("Failed to deploy settlement:", error);
      process.exit(1);
    }
  },
};
