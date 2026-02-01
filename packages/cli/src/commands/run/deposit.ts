import { CommandModule } from "yargs";

interface DepositArgs {
  tokenId: string;
  fromKey: string;
  toKey: string;
  amount: number;
  "env-path"?: string;
  env?: string[];
}

export const depositCommand: CommandModule<{}, DepositArgs> = {
  command: "deposit <tokenId> <fromKey> <toKey> <amount>",
  describe:
    "Deposit tokens to the bridge\n\nRequires: PROTOKIT_CUSTOM_TOKEN_PRIVATE_KEY (for custom tokens), PROTOKIT_CUSTOM_TOKEN_BRIDGE_PRIVATE_KEY, PROTOKIT_MINA_BRIDGE_CONTRACT_PRIVATE_KEY",
  builder: (yarg) =>
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
  handler: async (args) => {
    try {
      const { default: deposit } = await import(
        "../../scripts/bridge/deposit"
      );
      const { parseEnvArgs } = await import("../../utils/loadEnv");
      await deposit(
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
  },
};
