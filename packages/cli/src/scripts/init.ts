import { execSync } from "child_process";

import degit from "degit";

const STARTER_KIT_REPO = "proto-kit/starter-kit#develop";

export interface InitArgs {
  name?: string;
}

export default async function (args: InitArgs): Promise<void> {
  const targetDir = args.name ?? "starter-kit";

  console.log(`\nCloning starter-kit into ./${targetDir}...\n`);

  try {
    const emitter = degit(STARTER_KIT_REPO);

    emitter.on("info", (info) => {
      console.log(info.message);
    });

    await emitter.clone(targetDir);

    execSync("git init -b develop", { cwd: targetDir, stdio: "ignore" });
    execSync("git add -A", { cwd: targetDir, stdio: "ignore" });
    // eslint-disable-next-line @typescript-eslint/quotes
    execSync('git commit -m "initial commit"', {
      cwd: targetDir,
      stdio: "ignore",
    });

    console.log(`\nProject created at ./${targetDir}`);
    console.log("\nNext steps:");
    console.log(`  cd ${targetDir}`);
    console.log("  pnpm install");
    console.log("  pnpm env:development prisma:generate");
    console.log("  pnpm env:inmemory dev");
    console.log("  ✨ You're all set. Enjoy coding! ✨");
    console.log(
      "\nFor more details, see the README.md in the project directory.\n"
    );
  } catch (error) {
    console.error("Failed to initialize project:", error);
    throw error;
  }
}
