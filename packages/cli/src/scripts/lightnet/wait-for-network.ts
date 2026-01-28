/* eslint-disable no-console */
/* eslint-disable func-names */
import { sleep } from "@proto-kit/common";
import { fetchLastBlock, Provable } from "o1js";

import {
  loadEnvironmentVariables,
  getRequiredEnv,
  LoadEnvOptions,
} from "../../utils/loadEnv";

const maxAttempts = 24;
const delay = 5000;

export default async function (options?: LoadEnvOptions) {
  loadEnvironmentVariables(options);
  const graphqlEndpoint = `${getRequiredEnv("MINA_NODE_GRAPHQL_HOST")}:${getRequiredEnv("MINA_NODE_GRAPHQL_PORT")}/graphql`;
  let lastBlock;
  let attempt = 0;
  console.log("Waiting for network to be ready...");
  while (!lastBlock) {
    attempt += 1;
    if (attempt > maxAttempts) {
      throw new Error(
        `Network was still not ready after ${(delay / 1000) * (attempt - 1)}s`
      );
    }
    try {
      // eslint-disable-next-line no-await-in-loop
      lastBlock = await fetchLastBlock(graphqlEndpoint);
    } catch (e) {
      // continue
    }
    // eslint-disable-next-line no-await-in-loop
    await sleep(delay);
  }

  Provable.log("Network is ready", lastBlock);
}
/* eslint-enable no-console */
/* eslint-enable func-names */
