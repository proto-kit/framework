import { CommandModule } from "yargs";

export const settlementCommand: CommandModule = {
  command: "settlement <subcommand>",
  describe: "Settlement operations",
  builder: async (yargs) => {
    const { deployCommand } = await import("./deploy");
    const { tokenDeployCommand } = await import("./tokenDeploy");

    return yargs
      .command(deployCommand)
      .command(tokenDeployCommand)
      .demandCommand(
        1,
        "You must specify a subcommand. Use --help to see available options."
      );
  },
  handler: () => {
    console.log("Use a subcommand. See --help for available options.");
  },
};
