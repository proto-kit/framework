import { spawn } from "child_process";

const DEFAULT_EXPLORER_IMAGE = "ghcr.io/proto-kit/explorer:latest";

async function pullDockerImage(image: string): Promise<void> {
  return await new Promise<void>((resolve, reject) => {
    console.log(`Pulling Docker image: ${image}...`);
    const pullChild = spawn("docker", ["pull", image], {
      stdio: "inherit",
    });

    pullChild.on("error", (error) => {
      console.error("Failed to pull Docker image:", error);
      reject(error);
    });

    pullChild.on("exit", (code) => {
      if (code !== null && code !== 0) {
        reject(new Error(`Docker pull failed with code ${code}`));
      } else {
        console.log("Docker image pulled successfully");
        resolve();
      }
    });
  });
}

async function runDockerContainer(args: {
  port?: number;
  indexerUrl?: string;
  dashboardTitle?: string;
  dashboardSlogan?: string;
  explorerImage: string;
}): Promise<void> {
  const { port = 5003, explorerImage } = args;
  console.log(`\nExplorer is running at http://localhost:${port}\n`);

  const dockerArgs = [
    "run",
    "-d",
    "--rm",
    "--name",
    "protokit-explorer",
    "-p",
    `${port}:3000`,
  ];

  if (args.indexerUrl !== undefined) {
    dockerArgs.push("-e", `NEXT_PUBLIC_INDEXER_URL=${args.indexerUrl}`);
  }
  if (args.dashboardTitle !== undefined) {
    dockerArgs.push("-e", `NEXT_PUBLIC_DASHBOARD_TITLE=${args.dashboardTitle}`);
  }
  if (args.dashboardSlogan !== undefined) {
    dockerArgs.push(
      "-e",
      `NEXT_PUBLIC_DASHBOARD_SLOGAN=${args.dashboardSlogan}`
    );
  }

  dockerArgs.push(explorerImage);

  return await new Promise<void>((resolve, reject) => {
    const child = spawn("docker", dockerArgs, {
      stdio: "inherit",
    });

    child.on("error", (error) => {
      console.error("Failed to start explorer container:", error);
      reject(error);
    });

    child.on("exit", (code) => {
      if (code !== null && code !== 0 && code !== 143) {
        reject(new Error(`Explorer container exited with code ${code}`));
      } else {
        resolve();
      }
    });

    process.on("SIGINT", () => {
      child.kill();
      resolve();
    });

    process.on("SIGTERM", () => {
      child.kill();
      resolve();
    });
  });
}

export default async function (args: {
  port?: number;
  indexerUrl?: string;
  dashboardTitle?: string;
  dashboardSlogan?: string;
  explorerImage?: string;
}): Promise<void> {
  try {
    const explorerImage = args.explorerImage ?? DEFAULT_EXPLORER_IMAGE;
    await pullDockerImage(explorerImage);
    await runDockerContainer({ ...args, explorerImage });
  } catch (error) {
    console.error("Failed to start explorer:", error);
    throw error;
  }
}
