import { LoadEnvOptions } from "../../utils/loadEnv";

const maxAttempts = 24;
const delay = 5000;

export default async function (options: LoadEnvOptions) {
  const { loadEnvironmentVariables, getRequiredEnv } =
    await import("../../utils/loadEnv");
  const { sleep } = await import("@proto-kit/common");
  const { fetchLastBlock, Provable } = await import("o1js");
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
