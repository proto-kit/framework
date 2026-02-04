import { CommandModule } from "yargs";

export const runCommand: CommandModule = {
  command: "run <subcommand>",
  describe: "Run various operations",
  builder: async (yargs) => {
    const { generateKeysCommand } = await import("./generateKeys");

    return yargs
      .command(generateKeysCommand)
      .demandCommand(
        1,
        "You must specify a subcommand. Use --help to see available options."
      );
  },
  handler: () => {
    console.log("Use a subcommand. See --help for available options.");
  },
};
