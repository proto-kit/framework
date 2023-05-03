/* eslint-disable import/no-unused-modules */
/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
import { type DependencyContainer, container, Lifecycle } from 'tsyringe';

import { type AnyConstructor, isRuntimeModule } from '../module/decorator.js';
import type { RuntimeModule } from '../runtime/RuntimeModule.js';

export interface RuntimeModules {
  [name: string]: AnyConstructor;
}

export class Chain<ChainRuntimeModules extends RuntimeModules> {
  public static from<ChainRuntimeModules extends RuntimeModules>(
    runtimeModules: ChainRuntimeModules
  ) {
    return new Chain(runtimeModules);
  }

  private readonly runtimeContainer: DependencyContainer;

  public constructor(private readonly runtimeModules: ChainRuntimeModules) {
    this.runtimeContainer = container.createChildContainer();
    Object.entries(runtimeModules).forEach(([name, runtimeModule]) => {
      this.registerRuntimeModule(name, runtimeModule);
    });
  }

  private decorateRuntimeModule(name: string) {
    const runtimeModuleInstance =
      this.runtimeContainer.resolve<RuntimeModule>(name);
    runtimeModuleInstance.name = name;
  }

  public get runtimeModuleNames() {
    return Object.keys(this.runtimeModules);
  }

  public getRuntimeModule<Key extends keyof ChainRuntimeModules>(name: Key) {
    if (typeof name !== 'string') {
      throw new TypeError('Only string names are supported');
    }

    if (!this.runtimeModuleNames.includes(name)) {
      throw new Error(`
            Unable to retrieve module: ${name}, it is not registred as a runtime module for this chain`);
    }

    return this.runtimeContainer.resolve<
      InstanceType<ChainRuntimeModules[Key]>
    >(name);
  }

  public registerRuntimeModule(name: string, runtimeModule: AnyConstructor) {
    if (!isRuntimeModule(runtimeModule)) {
      throw new Error(
        `Unable to register module: ${name} / ${runtimeModule.name}, did you forget to add @runtimeModule()?`
      );
    }
    this.runtimeContainer.register(
      name,
      {
        useClass: runtimeModule,
      },
      {
        lifecycle: Lifecycle.ContainerScoped,
      }
    );

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const dependencies: { name?: string }[] | string[] | undefined =
      Reflect.getMetadata('design:paramtypes', runtimeModule);

    dependencies?.forEach((dependency: string | { name?: string }) => {
      const name =
        typeof dependency === 'string' ? dependency : dependency.name;

      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (!name) {
        throw new Error(`
              Unable to register module: ${runtimeModule.name}, attempting to inject a non-module dependency`);
      }
      if (!this.runtimeModuleNames.includes(name)) {
        throw new Error(`
            Unable to register module: ${runtimeModule.name}, attempting to inject a dependency that is not registred as a runtime module for this chain: ${name}`);
      }
    });

    this.decorateRuntimeModule(name);
  }
}
