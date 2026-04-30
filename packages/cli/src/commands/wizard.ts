import { CommandModule } from "yargs";

export const wizardCommand: CommandModule<{}> = {
  command: "wizard",
  describe: "Create a new environment configuration with guided wizard",
  builder: (yarg) => yarg,
  handler: async () => {
    try {
      const { default: createEnvironment } =
        await import("../scripts/wizard/generate");
      await createEnvironment();
      process.exit(0);
    } catch (error) {
      console.error("Failed to create environment:", error);
      process.exit(1);
    }
  },
};
