import { CommandModule } from "yargs";

interface FaucetArgs {
  publicKey: string;
  "env-path"?: string;
  env?: string[];
}

export const faucetCommand: CommandModule<{}, FaucetArgs> = {
  command: "faucet <publicKey>",
  describe: "Send MINA to an account from the lightnet faucet",
  builder: (yarg) =>
    yarg
      .positional("publicKey", {
        type: "string",
        describe: "public key to send MINA to",
        demandOption: true,
      })
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
      const { default: faucet } = await import(
        "../../scripts/lightnet/faucet"
      );
      await faucet(args.publicKey);
      process.exit(0);
    } catch (error) {
      console.error("Failed to send funds from faucet:", error);
      process.exit(1);
    }
  },
};
