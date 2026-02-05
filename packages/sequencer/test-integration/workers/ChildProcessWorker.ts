import { spawn, ChildProcess } from "node:child_process";

export class ChildProcessWorker {
  process?: ChildProcess;

  start(
    name: string,
    file: string,
    forwardLogs: boolean = true,
    env_args: Record<string, string> = {}
  ) {
    // eslint-disable-next-line no-console
    console.log("Spawning process");

    const s = spawn(
      "node",
      [
        "--loader",
        "ts-node/esm",
        "--experimental-vm-modules",
        "--experimental-wasm-modules",
        "--es-module-specifier-resolution=node",
        "--no-warnings",
        file,
      ],
      {
        env: {
          ...process.env,
          IS_SPAWNED_PROCESS: "true",
          ...env_args,
        },
      }
    );

    [
      "exit",
      "SIGINT",
      "SIGUSR1",
      "SIGUSR2",
      "uncaughtException",
      "SIGTERM",
    ].forEach((eventType) => {
      process.on(eventType, () => this.kill());
    });

    s.on("error", (err) => {
      // eslint-disable-next-line no-console
      console.error(err);
    });
    if (forwardLogs) {
      s.stdout.on("data", (data) => {
        process.stdout.write(`${name}: ${data}`);
      });
    }
    s.stderr.on("data", (data) => {
      process.stderr.write(`${name}: ${data}`);
    });

    this.process = s;
  }

  kill() {
    this.process!.kill("SIGKILL");
    // eslint-disable-next-line no-console
    console.log("Killed", this.process!.killed);
  }
}
