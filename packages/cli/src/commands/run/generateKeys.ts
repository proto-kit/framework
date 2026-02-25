import { CommandModule } from "yargs";

import type { GenerateKeysArgs } from "../../scripts/generateKeys";

export const generateKeysCommand: CommandModule<{}, GenerateKeysArgs> = {
  command: "generate-keys [count]",
  describe: "Generate private/public key pairs for development",
  builder: (yarg) =>
    yarg.positional("count", {
      type: "number",
      default: 1,
      describe: "number of keys to generate",
    }),
  handler: async (args) => {
    try {
      const { default: generateKeys } =
        await import("../../scripts/generateKeys");
      await generateKeys({ count: args.count });
      process.exit(0);
    } catch (error) {
      console.error("Failed to generate keys:", error);
      process.exit(1);
    }
  },
};
