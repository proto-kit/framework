import { execSync } from "child_process";

const STARTER_KIT_REPO = "https://github.com/proto-kit/starter-kit.git";
const REPO_BRANCH = "develop";

export interface InitArgs {
  name?: string;
}

export default async function (args: InitArgs): Promise<void> {
  const targetDir = args.name ?? "starter-kit";

  console.log(`\nCloning starter-kit into ./${targetDir}...\n`);

  try {
    execSync(
      `git clone --depth 1 --branch ${REPO_BRANCH} ${STARTER_KIT_REPO} ${targetDir}`
    );

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
