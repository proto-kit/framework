import { CommandModule } from "yargs";

interface RedeemArgs {
  tokenId: string;
  toKey: string;
  amount: number;
  "env-path"?: string;
  env?: string[];
}

export const redeemCommand: CommandModule<{}, RedeemArgs> = {
  command: "redeem <tokenId> <toKey> <amount>",
  describe:
    "Redeem tokens from the bridge\n\nRequires: PROTOKIT_CUSTOM_TOKEN_PRIVATE_KEY",
  builder: (yarg) =>
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
  handler: async (args) => {
    try {
      const { default: redeem } = await import(
        "../../scripts/bridge/redeem"
      );
      const { parseEnvArgs } = await import("../../utils/loadEnv");
      await redeem(
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
  },
};
