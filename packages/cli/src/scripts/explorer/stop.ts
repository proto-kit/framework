import { spawn } from "child_process";

const CONTAINER_NAME = "protokit-explorer";

async function stopDockerContainer(): Promise<void> {
  return await new Promise<void>((resolve, reject) => {
    console.log(`Stopping explorer container...`);
    const child = spawn("docker", ["stop", CONTAINER_NAME], {
      stdio: "inherit",
    });

    child.on("error", (error) => {
      console.error("Failed to stop explorer container:", error);
      reject(error);
    });

    child.on("exit", (code) => {
      if (code !== null && code !== 0) {
        reject(
          new Error(`Failed to stop explorer container (exit code ${code})`)
        );
      } else {
        console.log("Explorer container stopped successfully");
        resolve();
      }
    });
  });
}

export default async function (): Promise<void> {
  try {
    await stopDockerContainer();
  } catch (error) {
    console.error("Failed to stop explorer:", error);
    throw error;
  }
}
