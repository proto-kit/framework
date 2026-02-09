import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

export default async function (args: {
  port?: number;
  indexerUrl?: string;
  dashboardTitle?: string;
  dashboardSlogan?: string;
}): Promise<void> {
  let explorerDir: string;

  try {
    const pkgUrl = await import.meta.resolve(
      "@proto-kit/explorer/package.json"
    );
    const pkgPath = fileURLToPath(pkgUrl);
    explorerDir = path.dirname(pkgPath);
  } catch (error) {
    console.error("Failed to find @proto-kit/explorer package.");
    throw error;
  }

  return await new Promise<void>((resolve, reject) => {
    const child = spawn("npm", ["run", "dev", "--", "-p", String(args.port)], {
      cwd: explorerDir,
      stdio: "inherit",
      env: {
        ...process.env,
        NODE_OPTIONS: "",
        NEXT_PUBLIC_INDEXER_URL: args.indexerUrl,
        NEXT_PUBLIC_DASHBOARD_TITLE: args.dashboardTitle,
        NEXT_PUBLIC_DASHBOARD_SLOGAN: args.dashboardSlogan,
      },
    });

    child.on("error", (error) => {
      console.error("Failed to start explorer:", error);
      reject(error);
    });

    child.on("exit", (code) => {
      if (code !== null && code !== 0 && code !== 143) {
        reject(new Error(`Explorer process exited with code ${code}`));
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
