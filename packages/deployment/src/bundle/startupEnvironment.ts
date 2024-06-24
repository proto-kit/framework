import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { Environments, Startable } from "./Environment";

/**
 * Function that starts up an appchain based on a given environment
 */
export async function startupEnvironment(environment: Environments<Startable>) {
  const args = await yargs(hideBin(process.argv))
    .options({
      environment: {
        default: "default",
        requiresArg: true,
      },
      configuration: {
        default: "sequencer",
        requiresArg: true,
      },
      logLevel: {
        type: "string",
        requiresArg: false,
      },
      prune: {
        type: "boolean",
        default: false,
      },
    })
    .parse();

  if (args.logLevel === undefined) {
    const defaultLogLevel = "DEBUG";
    // eslint-disable-next-line @typescript-eslint/dot-notation
    args.logLevel = process.env["LOGGING_LEVEL"] ?? defaultLogLevel;
  }

  await environment.start({
    ...args,
    logLevel: args.logLevel!,
  });
}
