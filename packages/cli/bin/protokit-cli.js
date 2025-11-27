#!/usr/bin/env node
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import process from "process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);

if (!process.env.TS_NODE_LOADER_ACTIVE) {
  const env = { ...process.env };
  env.TS_NODE_LOADER_ACTIVE = "1";
  env.NODE_OPTIONS = [
    env.NODE_OPTIONS || "",
    "--loader ts-node/esm",
    "--experimental-vm-modules",
    "--experimental-wasm-modules",
    "--es-module-specifier-resolution=node",
    "--no-warnings",
  ].join(" ");

  const child = spawn(
    "node",
    [path.join(__dirname, "../dist/index.js"), ...args],
    {
      stdio: "inherit",
      env,
    }
  );

  child.on("exit", (code) => process.exit(code));
  child.on("error", (err) => {
    console.error(err);
    process.exit(1);
  });
} else {
  import(path.join(__dirname, "../dist/index.js")).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
