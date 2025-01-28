import { spawn, ChildProcess } from "node:child_process";

export class ChildProcessWorker {
  process?: ChildProcess;

  start(forwardLogs: boolean = true) {
    const s = spawn("node", [
      "--experimental-vm-modules",
      "--experimental-wasm-modules",
      "../../node_modules/jest/bin/jest.js",
      "./test-integration/workers/worker.test.ts",
    ]);
    s.on("error", (err) => {
      console.error(err);
    });
    if (forwardLogs) {
      s.stdout.on("data", (data) => {
        process.stdout.write(data);
      });
    }
    s.stderr.on("data", (data) => {
      process.stderr.write(data);
    });

    this.process = s;
  }

  kill() {
    this?.process?.kill();
  }
}
