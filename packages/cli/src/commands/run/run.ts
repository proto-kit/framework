import { CommandModule } from "yargs";

export const runCommand: CommandModule = {
  command: "run <subcommand>",
  describe: "Run various operations",
  builder: async (yargs) => {
    const { generateKeysCommand } = await import("./generateKeys");
    const { waitForNetworkCommand } = await import("./waitForNetwork");
    const { faucetCommand } = await import("./faucet");
    const { deployCommand } = await import("./deploy");
    const { tokenDeployCommand } = await import("./tokenDeploy");
    const { initializeCommand } = await import("./initialize");
    const { depositCommand } = await import("./deposit");
    const { redeemCommand } = await import("./redeem");
    const { withdrawCommand } = await import("./withdraw");

    return yargs
      .command(generateKeysCommand)
      .command(waitForNetworkCommand)
      .command(faucetCommand)
      .command(deployCommand)
      .command(tokenDeployCommand)
      .command(initializeCommand)
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
