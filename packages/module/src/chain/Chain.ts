/* eslint-disable new-cap */
/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
import { type DependencyContainer, container, Lifecycle } from 'tsyringe';
import { Experimental } from 'snarkyjs';

import {
  combineMethodName,
  isMethod,
  MethodPublicInput,
  toWrappedMethod,
} from '../method/decorator.js';
import { type AnyConstructor, isRuntimeModule } from '../module/decorator.js';
import type { RuntimeModule } from '../runtime/RuntimeModule.js';
import { StateService } from '../state/InMemoryStateService.js';

export interface RuntimeModules {
  [name: string]: AnyConstructor;
}

export interface ChainConfig<ChainRuntimeModules extends RuntimeModules> {
  state: StateService;
  runtimeModules: ChainRuntimeModules;
}

export class Chain<ChainRuntimeModules extends RuntimeModules> {
  public static from<ChainRuntimeModules extends RuntimeModules>(
    config: ChainConfig<ChainRuntimeModules>
  ) {
    return new Chain(config);
  }

  private readonly runtimeContainer: DependencyContainer;

  public areProofsEnabled = false;

  public program?: ReturnType<typeof Experimental.ZkProgram>;

  public constructor(public config: ChainConfig<ChainRuntimeModules>) {
    this.runtimeContainer = container.createChildContainer();
    Object.entries(this.config.runtimeModules).forEach(
      ([name, runtimeModule]) => {
        this.registerRuntimeModule(name, runtimeModule);
      }
    );
  }

  private decorateRuntimeModule(name: string) {
    const runtimeModuleInstance =
      this.runtimeContainer.resolve<RuntimeModule>(name);
    runtimeModuleInstance.name = name;
    runtimeModuleInstance.chain = this;
  }

  public get runtimeModuleNames() {
    return Object.keys(this.config.runtimeModules);
  }

  public getRuntimeModule<Key extends keyof ChainRuntimeModules>(name: Key) {
    if (typeof name !== 'string') {
      throw new TypeError('Only string names are supported');
    }

    if (!this.runtimeModuleNames.includes(name)) {
      throw new Error(`
            Unable to retrieve module: ${name}, it is not registred as a runtime module for this chain`);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
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

  public enableProofs() {
    this.areProofsEnabled = true;
  }

  public disableProofs() {
    this.areProofsEnabled = false;
  }

  public setProofsEnabled(areProofsEnabled: boolean) {
    this.areProofsEnabled = areProofsEnabled;
  }

  public precompile() {
    type Methods = Parameters<typeof Experimental.ZkProgram>[0]['methods'];
    const methods = this.runtimeModuleNames.reduce<Methods>(
      (allMethods, runtimeModuleName) => {
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        const runtimeModule = this.getRuntimeModule(
          runtimeModuleName
        ) as RuntimeModule;

        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        const modulePrototype = Object.getPrototypeOf(runtimeModule) as Record<
          string,
          (...args: unknown[]) => unknown
        >;

        const modulePrototypeMethods =
          Object.getOwnPropertyNames(modulePrototype);

        const moduleMethods = modulePrototypeMethods.reduce<Methods>(
          (allModuleMethods, methodName) => {
            if (isMethod(runtimeModule, methodName)) {
              const combinedMethodName = combineMethodName(
                runtimeModuleName,
                methodName
              );
              const method = modulePrototype[methodName];
              const wrappedMethod = Reflect.apply(
                toWrappedMethod,
                runtimeModule,
                [methodName, method]
              );

              // eslint-disable-next-line no-warning-comments
              // TODO: find out how to import the Tuple type

              // eslint-disable-next-line max-len
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              const privateInputs = Reflect.getMetadata(
                'design:paramtypes',
                runtimeModule,
                methodName
              );

              return {
                ...allModuleMethods,

                [combinedMethodName]: {
                  // eslint-disable-next-line max-len
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                  privateInputs,
                  method: wrappedMethod,
                },
              };
            }

            return allModuleMethods;
          },
          {}
        );

        return {
          ...allMethods,
          ...moduleMethods,
        };
      },
      {}
    );

    // eslint-disable-next-line @typescript-eslint/require-array-sort-compare
    const sortedMethods = Object.fromEntries(Object.entries(methods).sort());

    this.program = Experimental.ZkProgram({
      publicInput: MethodPublicInput,
      methods: sortedMethods,
    });

    function analyze(this: Chain<RuntimeModules>) {
      if (!this.program) {
        throw new Error(
          `Unable to analyze program for chain: ${this.constructor.name}`
        );
      }
      const zkProgramAnalysis = this.program.analyzeMethods();
      return Object.keys(sortedMethods).map((methodName, index) => {
        const { rows } = zkProgramAnalysis[index];
        const { privateInputs: inputs } = sortedMethods[methodName];
        return {
          methodName,

          analysis: {
            rows,
            inputs,
          },
        };
      });
    }

    return {
      analyze,

      toPretty: () => {
        Reflect.apply(analyze, this, []).forEach(
          ({ methodName, analysis: methodAnalysis }) => {
            const inputs = methodAnalysis.inputs.map(
              // eslint-disable-next-line max-len
              // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any
              (input) => (input as any).name
            );
            // eslint-disable-next-line no-console
            console.log(`
Method: ${methodName}
Rows: ${methodAnalysis.rows}
Inputs: [${inputs.join(', ')}]
`);
          }
        );
      },
    };
  }

  public async compile() {
    this.precompile();
    if (!this.program) {
      throw new Error(
        'Unable to compile chain, pre-compilation did not produce a zkProgram'
      );
    }
    const { areProofsEnabled, program } = this;

    this.disableProofs();
    const artifact = await program.compile();

    this.setProofsEnabled(areProofsEnabled);

    return artifact;
  }
}
