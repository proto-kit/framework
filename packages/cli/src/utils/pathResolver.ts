import path from "path";
import fs from "fs";

export function resolveChainPath(isFolderRequired?: boolean): string {
  let currentDir = process.cwd();
  // eslint-disable-next-line no-constant-condition
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
  if (isFolderRequired === true) {
    throw new Error(
      "Unable to locate packages/chain. Make sure you run this command inside the project repository."
    );
  }
  return "";
}
