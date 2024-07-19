import { log, assertValidTextLogLevel } from "@proto-kit/common";
import { AppChain } from "@proto-kit/sdk";

export interface Startable {
  start(): Promise<void>;
}

export type StartableEnvironment<T> = Record<string, T>;

export class Environment<T extends Startable> {
  public constructor(private readonly bundle: StartableEnvironment<T>) {}

  public hasModule(
    configurationName: string
  ): configurationName is keyof StartableEnvironment<T> {
    return Object.keys(this.bundle).includes(configurationName);
  }

  private assertModuleProvided(configurationName: string) {
    if (!this.hasModule(configurationName)) {
      throw new Error(
        `Configuration with name ${configurationName} does not exist`
      );
    }
  }

  public getConfiguration(configurationName: string) {
    this.assertModuleProvided(configurationName);
    return this.bundle[configurationName];
  }

  public async start(configurationName: string) {
    await this.getConfiguration(configurationName).start();
  }

  public static from<T extends Startable>(bundle: StartableEnvironment<T>) {
    return new Environment(bundle);
  }
}

export class Environments<T extends Startable> {
  public constructor(
    private readonly bundles: Record<string, Environment<T>>
  ) {}

  private assertModuleProvided(environmentName: string) {
    if (!Object.keys(this.bundles).includes(environmentName)) {
      throw new Error(
        `Environment with name ${environmentName} does not exist`
      );
    }
  }

  public getEnvironment(environmentName: string) {
    this.assertModuleProvided(environmentName);
    return this.bundles[environmentName];
  }

  public async searchAndStart(configurationName: string) {
    const foundConfigurations = Object.entries(this.bundles).filter(
      ([key, value]) => value.hasModule(configurationName)
    );
    if (foundConfigurations.length > 1) {
      throw new Error(
        `Multiple configurations with name ${configurationName} exist in following environemnts: ${foundConfigurations.map(([key]) => key)}`
      );
    } else {
      await foundConfigurations[0][1].start(configurationName);
    }
  }

  public static from<T extends Startable>(
    bundles: Record<string, Environment<T>>
  ) {
    return new Environments(bundles);
  }

  public async start(args: {
    environment: string;
    configuration?: string;
    logLevel: string;
    prune?: boolean;
    // Yeah, I know kinda hacky
    returnInsteadOfStarting?: boolean;
  }) {
    const { environment, configuration, logLevel, prune } = args;

    assertValidTextLogLevel(logLevel);
    // eslint-disable-next-line no-console
    log.info(`Setting log level to: ${logLevel}`);
    log.setLevel(logLevel);
    log.info(`Configuring environment: ${environment}`);

    const appchain = this.getEnvironment(environment).getConfiguration(
      configuration ?? "sequencer"
    );

    // TODO Temporary workaround
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    (appchain as unknown as AppChain<any, any, any, any>).configurePartial({
      Sequencer: {
        DatabasePruneModule: {
          pruneOnStartup: prune,
        },
      },
    });

    if (!(args.returnInsteadOfStarting ?? false)) {
      await appchain.start();
    }

    return appchain;
  }
}
