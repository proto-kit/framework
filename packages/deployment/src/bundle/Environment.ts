export interface Startable {
  start(): Promise<void>;
}

export type StartableBundle<T> = Record<string, T>;

export class Environment<T extends Startable> {
  public constructor(private readonly bundle: StartableBundle<T>) {}

  private assertModuleProvided(configurationName: string) {
    if (!Object.keys(this.bundle).includes(configurationName)) {
      throw new Error(
        `Configuration with name ${configurationName} does not exist`
      );
    }
  }

  public async start(configurationName: string) {
    this.assertModuleProvided(configurationName);
    await this.bundle[configurationName].start();
  }

  public static from<T extends Startable>(bundle: StartableBundle<T>) {
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

  public async start(environmentName: string, configurationName: string) {
    this.assertModuleProvided(environmentName);
    await this.bundles[environmentName].start(configurationName);
  }

  public static from<T extends Startable>(
    bundles: Record<string, Environment<T>>
  ) {
    return new Environments(bundles);
  }
}

/**
 * Function that starts up an appchain based on a given environment
 */
export async function startUpEnvironment(environment: Environments<Startable>) {
  const args = process.argv;

  if (args.length < 4) {
    throw new Error("No configuration was selected to execute");
  }

  await environment.start(args.at(-2)!, args.at(-1)!);
}
