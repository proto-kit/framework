import {
  LoadEnvOptions,
  getRequiredEnv,
  loadEnvironmentVariables,
} from "../../utils/loadEnv";

export default async function (options: LoadEnvOptions) {
  try {
    loadEnvironmentVariables(options);
    const { default: lightnetWaitForNetworkScript } =
      await import("./wait-for-network");
    const { default: lightnetFaucetScript } = await import("./faucet");
    const { default: settlementDeployScript } =
      await import("../settlement/deploy");
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
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Cannot find package '@prisma/client-indexer'")
    ) {
      console.error("Error: @prisma/client-indexer not found.");
      console.error(
        "Please run the following command first to generate the Prisma client:"
      );
      console.error("  pnpm prisma:generate");
      process.exit(1);
    }
    throw error;
  }
}
