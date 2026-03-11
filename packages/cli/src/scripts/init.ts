import { spawn } from "child_process";

const STARTER_KIT_REPO = "https://github.com/proto-kit/starter-kit.git";

export interface InitArgs {
  name?: string;
}

export default async function (args: InitArgs): Promise<void> {
  const targetDir = args.name ?? "starter-kit";

  console.log(`\nCloning starter-kit into ./${targetDir}...\n`);

  return await new Promise<void>((resolve, reject) => {
    const child = spawn("git", ["clone", STARTER_KIT_REPO, targetDir], {
      stdio: "inherit",
    });

    child.on("error", (error) => {
      console.error("Failed to clone starter-kit:", error);
      reject(error);
    });

    child.on("exit", (code) => {
      if (code !== null && code !== 0) {
        reject(new Error(`git clone failed with exit code ${code}`));
      } else {
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
        resolve();
      }
    });
  });
}
