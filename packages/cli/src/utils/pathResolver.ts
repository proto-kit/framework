import path from "path";
import fs from "fs";

export function resolveChainPath(): string {
  let currentDir = process.cwd();
  while (true) {
    const candidate = path.join(currentDir, "packages", "chain");

    if (fs.existsSync(candidate)) {
      return candidate;
    }

    const parent = path.dirname(currentDir);
    if (parent === currentDir) {
      break;
    }

    currentDir = parent;
  }

  throw new Error(
    "Unable to locate packages/chain. Make sure you run this command inside the project repository."
  );
}
