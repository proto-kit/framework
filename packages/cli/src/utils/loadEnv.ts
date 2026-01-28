/* eslint-disable no-console */

import path from "path";
import fs from "fs";

import dotenv from "dotenv";

export type LoadEnvOptions = {
  envPath?: string;
  envVars?: Record<string, string>;
};

export function loadEnvironmentVariables(options?: LoadEnvOptions) {
  const cwd = process.cwd();

  if (options?.envPath !== undefined) {
    if (fs.existsSync(options.envPath)) {
      dotenv.config({ path: options.envPath });
      console.log(`Loaded environment from ${options.envPath}`);
    } else {
      throw new Error(`Environment file not found at ${options.envPath}`);
    }
  } else {
    const envPath = path.join(cwd, "./src/core/environments/development/.env");

    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
      console.log(`Loaded environment from ${envPath}`);
    } else {
      console.warn(`.env file not found at ${envPath}`);
    }
  }
  if (options?.envVars !== undefined) {
    Object.entries(options.envVars).forEach(([key, value]) => {
      process.env[key] = value;
    });
    console.log(
      `Loaded ${Object.keys(options.envVars).length} environment variables from arguments`
    );
  }
}

export function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (value === undefined) {
    throw new Error(
      `Required environment variable "${key}" is not defined. Please check your .env file or pass it as an argument.`
    );
  }
  return value;
}

export function parseEnvArgs(args: string[]): Record<string, string> {
  const envVars: Record<string, string> = {};

  for (const arg of args) {
    if (arg.includes("=")) {
      const [key, value] = arg.split("=", 2);
      envVars[key.trim()] = value.trim();
    }
  }

  return envVars;
}
/* eslint-enable no-console */
