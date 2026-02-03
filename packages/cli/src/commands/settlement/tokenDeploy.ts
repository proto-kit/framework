import { CommandModule } from "yargs";

interface TokenDeployArgs {
  tokenSymbol: string;
  feepayerKey: string;
  receiverPublicKey: string;
  mintAmount: number;
  "env-path"?: string;
  env?: string[];
}

export const tokenDeployCommand: CommandModule<{}, TokenDeployArgs> = {
  command:
    "token-deploy <tokenSymbol> <feepayerKey> <receiverPublicKey> [mintAmount]",
  describe:
    "Deploy custom fungible token for settlement\n\nRequires: PROTOKIT_SETTLEMENT_CONTRACT_PRIVATE_KEY, PROTOKIT_DISPATCHER_CONTRACT_PRIVATE_KEY, PROTOKIT_CUSTOM_TOKEN_PRIVATE_KEY, PROTOKIT_CUSTOM_TOKEN_ADMIN_PRIVATE_KEY, PROTOKIT_CUSTOM_TOKEN_BRIDGE_PRIVATE_KEY",
  builder: (yarg) =>
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
  handler: async (args) => {
    try {
      const { default: tokenDeploy } = await import(
        "../../scripts/settlement/deploy-token"
      );
      const { parseEnvArgs } = await import("../../utils/loadEnv");
      await tokenDeploy(
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
      console.error("Failed to deploy token:", error);
      process.exit(1);
    }
  },
};
