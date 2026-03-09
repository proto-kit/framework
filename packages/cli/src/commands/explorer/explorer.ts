import { CommandModule } from "yargs";

export const explorerCommand: CommandModule = {
  command: "explorer <subcommand>",
  describe: "Explorer commands",
  builder: async (yargs) => {
    const { explorerStartCommand } = await import("./explorerStart");
    const { explorerStopCommand } = await import("./explorerStop");

    return yargs
      .command(explorerStartCommand)
      .command(explorerStopCommand)
      .demandCommand(
        1,
        "You must specify a subcommand. Use --help to see available options."
      );
  },
  handler: () => {
    console.log("Use a subcommand. See --help for available options.");
  },
};
