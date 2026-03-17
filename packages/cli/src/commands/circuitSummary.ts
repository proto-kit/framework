import { CommandModule } from "yargs";

export const circuitSummaryCommand: CommandModule = {
  command: "summary",
  describe:
    "Print a summary of the circuit sizes of runtime and protocol circuits",
  builder: (yarg) => yarg,
  handler: async () => {
    try {
      const { default: circuitSummary } =
        await import("../scripts/circuitSummary");
      await circuitSummary();
      process.exit(0);
    } catch (error) {
      console.error("Failed to generate circuit summary:", error);
      process.exit(1);
    }
  },
};
