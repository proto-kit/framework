/* eslint-disable no-console */

import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import http from "http";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
export async function isGraphQLEndpointUp(url: string): Promise<boolean> {
  return await new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.destroy();
      resolve(res.statusCode === 200);
    });
    req.on("error", () => resolve(false));
    req.end();
  });
}
export async function waitForGraphQLEndpoint(
  url: string,
  retries = 8,
  intervalMs = 5000
): Promise<void> {
  for (let i = 0; i < retries; i++) {
    // eslint-disable-next-line no-await-in-loop
    if (await isGraphQLEndpointUp(url)) return;
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => {
      setTimeout(resolve, intervalMs);
    });
  }
  throw new Error(`GraphQL endpoint did not start after ${retries} attempts.`);
}
function resolveSpectaqlBin(): string {
  const searchPaths = [process.cwd(), dirname];

  for (const base of searchPaths) {
    try {
      const pkgPath = require.resolve("spectaql/package.json", {
        paths: [base],
      });
      const spectaqlDir = path.dirname(pkgPath);
      const spectaqlBin = path.join(spectaqlDir, "bin", "spectaql.js");
      if (fs.existsSync(spectaqlBin)) return spectaqlBin;
    } catch (_) {
      // continue
    }
  }
  throw new Error("Unable to locate SpectaQL. Please install it first.");
}

async function runSpectaql(
  binPath: string,
  configPath: string,
  cwd = process.cwd()
): Promise<void> {
  return await new Promise((resolve, reject) => {
    const proc = spawn("node", [binPath, configPath], {
      cwd,
      stdio: ["inherit", "pipe", "pipe"],
      shell: true,
    });

    proc.stdout.on("data", () => {});
    proc.stderr.on("data", () => {});

    proc.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`SpectaQL process failed with exit code ${code}`))
    );

    proc.on("error", reject);
  });
}
function cleanUp(generatedPath: string) {
  try {
    fs.unlinkSync(generatedPath);
  } catch (e) {
    console.error("Failed to delete temporary config:", e);
  }
}
export async function generateGqlDocs(gqlUrl: string) {
  const templatePath = path.resolve(
    dirname,
    "../../spectaql.config.template.yml"
  );
  const generatedPath = path.resolve(process.cwd(), "spectaql.config.yml");

  if (!fs.existsSync(templatePath)) {
    console.warn(
      `Template not found at ${templatePath}, skipping doc generation.`
    );
    return;
  }

  console.log("Preparing dynamic SpectaQL config...");

  let configContent = fs.readFileSync(templatePath, "utf8");
  const match = gqlUrl.match(/:(\d+)\//);
  const port = match ? match[1] : "8080";
  configContent = configContent.replace(/{{PORT}}/g, port);

  fs.writeFileSync(generatedPath, configContent);

  await waitForGraphQLEndpoint(gqlUrl, 8, 5000);

  console.log("Generating GraphQL docs...");
  const spectaqlBin = resolveSpectaqlBin();
  await runSpectaql(spectaqlBin, generatedPath);
  console.log("Docs generated successfully!");
  cleanUp(generatedPath);
}
/* eslint-enable no-console */
