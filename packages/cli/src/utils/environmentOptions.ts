import { Argv } from "yargs";

export function addEnvironmentOptions<T>(yargs: Argv<T>): Argv<T> {
  return yargs
    .option("env-path", {
      type: "string",
      describe: "path to .env file",
    })
    .option("env", {
      type: "string",
      describe:
        "environment name to load from src/core/environments/{environment}/.env",
      default: "development",
    })
    .option("set", {
      type: "string",
      array: true,
      describe: "environment variables as KEY=value",
    });
}
