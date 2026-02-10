#!/usr/bin/env node
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import fs from "fs";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveTsNodeEsm() {
  const searchPaths = [process.cwd(), __dirname];

  for (const base of searchPaths) {
    try {
      const pkgPath = require.resolve("ts-node/package.json", {
        paths: [base],
      });
      const tsNodeDir = path.dirname(pkgPath);
      const esmPath = path.join(tsNodeDir, "esm.mjs");
      if (fs.existsSync(esmPath)) return esmPath;
    } catch (_) {
      // continue
    }
  }
  return "ts-node/esm";
}

const args = process.argv.slice(2);

if (!process.env.TS_NODE_LOADER_ACTIVE) {
  const env = { ...process.env };
  env.TS_NODE_LOADER_ACTIVE = "1";
  env.TS_NODE_TRANSPILE_ONLY = "true";
  env.TS_NODE_SKIP_PROJECT = "false";
  env.TS_NODE_PREFER_TS_EXTS = "true";

  // Configure ts-node for proper ESM/CJS interop
  env.TS_NODE_ESMODULEINTEROP = "true";
  env.TS_NODE_ALLOWJS = "true";
  env.TS_NODE_EXPERIMENTALMODULES = "true";
  env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({
    module: "ESNext",
    moduleResolution: "node",
    allowSyntheticDefaultImports: true,
    esModuleInterop: true,
    allowJs: true,
    target: "ES2020",
    experimentalDecorators: true,
    emitDecoratorMetadata: true,
    strictNullChecks: false,
    noEmit: true,
  });

  const tsNodeEsm = resolveTsNodeEsm();
  env.NODE_OPTIONS = [
    env.NODE_OPTIONS || "",
    `--loader ${tsNodeEsm}`,
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
