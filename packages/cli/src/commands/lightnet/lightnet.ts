import { CommandModule } from "yargs";

export const lightnetCommand: CommandModule = {
  command: "lightnet <subcommand>",
  describe: "Lightnet operations",
  builder: async (yargs) => {
    const { faucetCommand } = await import("./faucet");
    const { initializeCommand } = await import("./initialize");
    const { waitForNetworkCommand } = await import("./waitForNetwork");

    return yargs
      .command(faucetCommand)
      .command(initializeCommand)
      .command(waitForNetworkCommand)
      .demandCommand(
        1,
        "You must specify a subcommand. Use --help to see available options."
      );
  },
  handler: () => {
    console.log("Use a subcommand. See --help for available options.");
  },
};
