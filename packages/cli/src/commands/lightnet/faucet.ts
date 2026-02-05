import { CommandModule } from "yargs";

import { addEnvironmentOptions } from "../../utils/environmentOptions";

interface FaucetArgs {
  publicKey: string;
  "env-path"?: string;
  env?: string;
  set?: string[];
}

export const faucetCommand: CommandModule<{}, FaucetArgs> = {
  command: "faucet <publicKey>",
  describe: "Send MINA to an account from the lightnet faucet",
  builder: (yarg) =>
    addEnvironmentOptions(
      yarg.positional("publicKey", {
        type: "string",
        describe: "public key to send MINA to",
        demandOption: true,
      })
    ),
  handler: async (args) => {
    try {
      const { default: faucet } = await import("../../scripts/lightnet/faucet");
      const { loadEnvironmentVariables, parseEnvArgs } = await import(
        "../../utils/loadEnv"
      );
      loadEnvironmentVariables({
        envPath: args["env-path"],
        env: args.env!,
        envVars: parseEnvArgs(args.set ?? []),
      });
      await faucet(args.publicKey);
      process.exit(0);
    } catch (error) {
      console.error("Failed to send funds from faucet:", error);
      process.exit(1);
    }
  },
};
