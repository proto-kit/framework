import { CommandModule } from "yargs";

export const explorerStopCommand: CommandModule = {
  command: "stop",
  describe: "Stop the explorer UI",
  handler: async () => {
    try {
      const { default: explorerStop } =
        await import("../../scripts/explorer/stop");
      await explorerStop();
      process.exit(0);
    } catch (error) {
      console.error("Failed to stop explorer:", error);
      process.exit(1);
    }
  },
};
