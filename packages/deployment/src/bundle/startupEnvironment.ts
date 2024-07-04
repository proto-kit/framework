import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { Environments, Startable } from "./Environment";

/**
 * Function that starts up an appchain based on a given environment
 */
export async function startupEnvironment(environment: Environments<Startable>) {
  const args = await yargs(hideBin(process.argv))
    .env("PROTOKIT")
    .options({
      environment: {
        default: "default",
        requiresArg: true,
        alias: ["env"],
      },
      configuration: {
        default: "sequencer",
        requiresArg: true,
        alias: ["config"],
      },
      logLevel: {
        type: "string",
        requiresArg: false,
        default: "DEBUG",
      },
      prune: {
        type: "boolean",
        default: false,
      },
    })
    .parse();

  console.log(args);

  await environment.start({
    ...args,
    logLevel: args.logLevel!,
  });
}
