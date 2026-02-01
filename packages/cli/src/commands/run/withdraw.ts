import { CommandModule } from "yargs";

interface WithdrawArgs {
  tokenId: string;
  senderKey: string;
  amount: number;
  "env-path"?: string;
  env?: string[];
}

export const withdrawCommand: CommandModule<{}, WithdrawArgs> = {
  command: "withdraw <tokenId> <senderKey> <amount>",
  describe: "Withdraw tokens\n\nRequires: NEXT_PUBLIC_PROTOKIT_GRAPHQL_URL",
  builder: (yarg) =>
    yarg
      .positional("tokenId", { type: "string", demandOption: true })
      .positional("senderKey", { type: "string", demandOption: true })
      .positional("amount", { type: "number", demandOption: true })
      .option("env-path", { type: "string", describe: "path to .env file" })
      .option("env", {
        type: "string",
        array: true,
        describe: "environment variables as KEY=value",
      }),
  handler: async (args) => {
    try {
      const { default: withdraw } = await import(
        "../../scripts/bridge/withdraw"
      );
      const { parseEnvArgs } = await import("../../utils/loadEnv");
      await withdraw(
        {
          envPath: args["env-path"],
          envVars: parseEnvArgs(args.env ?? []),
        },
        {
          tokenId: args.tokenId,
          senderKey: args.senderKey,
          amount: args.amount,
        }
      );
      process.exit(0);
    } catch (error) {
      console.error("Failed to withdraw from bridge:", error);
      process.exit(1);
    }
  },
};
