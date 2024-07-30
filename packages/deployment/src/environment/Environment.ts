import { log, assertValidTextLogLevel } from "@proto-kit/common";
import { AppChain } from "@proto-kit/sdk";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

export interface Startable {
  start(): Promise<void>;
}

export type StartableEnvironment<T> = Record<string, T>;

export class Environment<T extends Startable> {
  public constructor(
    private readonly configurations: StartableEnvironment<T>
  ) {}

  public hasConfiguration(
    configurationName: string
  ): configurationName is keyof StartableEnvironment<T> {
    return Object.keys(this.configurations).includes(configurationName);
  }

  private assertConfigurationProvided(configurationName: string) {
    if (!this.hasConfiguration(configurationName)) {
      throw new Error(
        `Configuration with name ${configurationName} does not exist`
      );
    }
  }

  public getConfiguration(configurationName: string) {
    this.assertConfigurationProvided(configurationName);
    return this.configurations[configurationName];
  }

  public static from<T extends Startable>(
    configurations: StartableEnvironment<T>
  ) {
    return new Environment(configurations);
  }

  public async start() {
    const { configuration, logLevel, prune } = await yargs(
      hideBin(process.argv)
    )
      .env("PROTOKIT")
      .options({
        environment: {
          default: "default",
          requiresArg: true,
          alias: ["env"],
        },
        configuration: {
          default: "sequencer",
          requiresArg: true,
          alias: ["config"],
        },
        logLevel: {
          type: "string",
          requiresArg: false,
          default: "INFO",
        },
        prune: {
          type: "boolean",
          default: false,
        },
      })
      .parse();

    assertValidTextLogLevel(logLevel);
    log.info(`Setting log level to: ${logLevel}`);
    log.setLevel(logLevel);

    const appChain = this.getConfiguration(configuration ?? "sequencer");

    // TODO Temporary workaround
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    (appChain as unknown as AppChain<any, any, any, any>).configurePartial({
      Sequencer: {
        DatabasePruneModule: {
          pruneOnStartup: prune,
        },
      },
    });

    await appChain.start();
  }
}
