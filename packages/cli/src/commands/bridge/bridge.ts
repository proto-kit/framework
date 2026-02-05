import { CommandModule } from "yargs";

export const bridgeCommand: CommandModule = {
  command: "bridge <subcommand>",
  describe: "Bridge operations",
  builder: async (yargs) => {
    const { depositCommand } = await import("./deposit");
    const { redeemCommand } = await import("./redeem");
    const { withdrawCommand } = await import("./withdraw");

    return yargs
      .command(depositCommand)
      .command(redeemCommand)
      .command(withdrawCommand)
      .demandCommand(
        1,
        "You must specify a subcommand. Use --help to see available options."
      );
  },
  handler: () => {
    console.log("Use a subcommand. See --help for available options.");
  },
};
