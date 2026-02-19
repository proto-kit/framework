import {
  LoadEnvOptions,
  getRequiredEnv,
  loadEnvironmentVariables,
} from "../../utils/loadEnv";

export default async function (options: LoadEnvOptions) {
  loadEnvironmentVariables(options);
  const { default: lightnetWaitForNetworkScript } = await import(
    "./wait-for-network"
  );
  const { default: lightnetFaucetScript } = await import("./faucet");
  const { default: settlementDeployScript } = await import(
    "../settlement/deploy"
  );
  console.log("Step 1: Waiting for network to be ready...");
  await lightnetWaitForNetworkScript(options);

  console.log("Step 2: Funding PROTOKIT_SEQUENCER_PUBLIC_KEY from faucet...");
  await lightnetFaucetScript(getRequiredEnv("PROTOKIT_SEQUENCER_PUBLIC_KEY"));

  console.log("Step 3: Funding TEST_ACCOUNT_1_PUBLIC_KEY from faucet...");
  await lightnetFaucetScript(getRequiredEnv("TEST_ACCOUNT_1_PUBLIC_KEY"));

  console.log("Step 4: Deploying settlement contracts...");
  await settlementDeployScript(options);

  console.log(
    "Lightnet initialization complete! Settlement contracts are deployed."
  );
}
