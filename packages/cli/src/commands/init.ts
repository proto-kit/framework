import { CommandModule } from "yargs";

import type { InitArgs } from "../scripts/init";

export const initCommand: CommandModule<{}, InitArgs> = {
  command: "init [name]",
  describe: "Create a new Protokit project from the starter-kit template",
  builder: (yarg) =>
    yarg.positional("name", {
      type: "string",
      default: "starter-kit",
      describe: "Directory name for the new project",
    }),
  handler: async (args) => {
    try {
      const { default: init } = await import("../scripts/init");
      await init({ name: args.name });
      process.exit(0);
    } catch (error) {
      console.error("Failed to initialize project:", error);
      process.exit(1);
    }
  },
};
