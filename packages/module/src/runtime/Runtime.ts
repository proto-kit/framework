// eslint-disable-next-line max-len
/* eslint-disable max-lines,@typescript-eslint/no-explicit-any,guard-for-in,@typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment */
import { type DependencyContainer, container, Lifecycle } from "tsyringe";
import { Experimental, Proof } from "snarkyjs";
import {
  ComponentConfig,
  ConfigurationAggregator,
  MethodPublicInput,
  RemoveUndefinedKeys,
  Subclass,
  TypedClassType, UninitializedComponentConfig
} from "@yab/protocol";

import {
  combineMethodName,
  isMethod,
  toWrappedMethod,
} from "../method/decorator.js";
import { type AnyConstructor, isRuntimeModule } from "../module/decorator.js";
import type { RuntimeModule } from "./RuntimeModule.js";
import type { StateService } from "../state/InMemoryStateService.js";

export interface RuntimeModules {
  [name: string]: TypedClassType<RuntimeModule<unknown>>;
}

export type ResolvedRuntimeModules<RM extends RuntimeModules> = {
  [name in keyof RM]: (RM[name] extends TypedClassType<RuntimeModule<infer R>> ? RuntimeModule<R> : any)
}

export interface ChainConfig<ChainRuntimeModules extends RuntimeModules> {
  state: StateService;
  runtimeModules: ChainRuntimeModules;
}

const errors = {
  onlyStringNames: () => new TypeError("Only string names are supported"),

  notRegisteredRuntimeModule: (name: string) =>
    new Error(
      `Unable to retrieve module: ${name}, it is not registered as a runtime module for this chain`
    ),

  missingDecorator: (name: string, runtimeModuleName: string) =>
    new Error(
      `Unable to register module: ${name} / ${runtimeModuleName},
      did you forget to add @runtimeModule()?`
    ),

  nonModuleDependecy: (runtimeModuleName: string) =>
    new Error(`
  Unable to register module: ${runtimeModuleName}, attempting to inject a non-module dependency`),

  unknownDependency: (runtimeModuleName: string, name: string) =>
    new Error(
      `Unable to register module: ${runtimeModuleName}, 
      attempting to inject a dependency that is not registred 
      as a runtime module for this chain: ${name}`
    ),

  unableToAnalyze: (name: string) =>
    new Error(`Unable to analyze program for chain: ${name}`),

  precompileFirst: () =>
    new Error(
      "You have to call precompile() before being able to create the proof class"
    ),

  zkProgramMissing: () =>
    new Error(
      "Unable to compile chain, pre-compilation did not produce a zkProgram"
    ),
};

/**
 * Wrapper for an application specific chain, which helps orchestrate
 * runtime modules into an interoperable runtime.
 */
export class Runtime<ChainRuntimeModules extends RuntimeModules> extends ConfigurationAggregator<
  ResolvedRuntimeModules<ChainRuntimeModules>
> {
  /**
   * Alternative constructor for `Chain`.
   *
   * @param config - Configuration for the returned Chain
   * @returns Chain with the provided config
   */
  public static from<ChainRuntimeModules extends RuntimeModules>(
    config: ChainConfig<ChainRuntimeModules>
  ) {
    return new Runtime(config);
  }

  // stores all runtime modules
  private readonly runtimeContainer: DependencyContainer;

  // determines whether any proving should be done when running methods
  public areProofsEnabled = false;

  // runtime modules composed into a ZkProgram
  public program?: ReturnType<typeof Experimental.ZkProgram>;

  // Current state of the config
  private currentConfig: UninitializedComponentConfig<
    ComponentConfig<ResolvedRuntimeModules<ChainRuntimeModules>>
  >;

  /**
   * Creates a new Chain from the provided config
   *
   * @param modules - Configuration object for the constructed Chain
   */
  public constructor(public modules: ChainConfig<ChainRuntimeModules>) {
    super();
    this.runtimeContainer = container.createChildContainer();
    Object.entries(this.modules.runtimeModules).forEach(
      ([name, runtimeModule]) => {
      this.registerRuntimeModule(name, runtimeModule);
    });

    // Initialize config to empty
    this.currentConfig = Object.keys(modules).reduce<any>((config, key) => {
      config[key] = undefined;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return config;
    }, {});
  }

  /**
   * Add a name and other respective properties required by RuntimeModules,
   * that come from the current Chain
   *
   * @param name - Name of the runtime module to decorate
   */
  private decorateRuntimeModule(name: string) {
    const runtimeModuleInstance =
      this.runtimeContainer.resolve<RuntimeModule<unknown>>(name);
    runtimeModuleInstance.name = name;
    runtimeModuleInstance.chain = this;
  }

  /**
   * @returns A list of names of all the registered module names
   */
  public get runtimeModuleNames() {
    return Object.keys(this.modules.runtimeModules);
  }

  /**
   * Returns a runtime module registred under the given key.
   *
   * @param name - Name of the runtime module to get
   * @returns A runtime module stored under the given key
   */
  public getRuntimeModule<Key extends keyof ChainRuntimeModules>(name: Key) {
    if (typeof name !== "string") {
      throw errors.onlyStringNames();
    }

    if (!this.runtimeModuleNames.includes(name)) {
      throw errors.notRegisteredRuntimeModule(name);
    }

    return this.runtimeContainer.resolve<
      InstanceType<ChainRuntimeModules[Key]>
    >(name);
  }

  private getAllRuntimeModules(): ResolvedRuntimeModules<ChainRuntimeModules> {
    const resolvedModules: any = {};
    for (const key in this.modules.runtimeModules) {
      resolvedModules[key] = this.getRuntimeModule(key);
    }
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return resolvedModules as ResolvedRuntimeModules<ChainRuntimeModules>;
  }

  /**
   * Registers a runtime module under the given name.
   *
   * @param name - Name of the runtime module to identify it by
   * @param runtimeModule - Runtime module to register
   */
  public registerRuntimeModule(name: string, runtimeModule: AnyConstructor) {
    if (!isRuntimeModule(runtimeModule)) {
      throw errors.missingDecorator(name, runtimeModule.name);
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

    const dependencies: { name?: string }[] | string[] | undefined = Reflect.getMetadata(
      "design:paramtypes",
      runtimeModule
    );

    dependencies?.forEach((dependency: string | { name?: string }) => {
      const name =
        typeof dependency === "string" ? dependency : dependency.name;

      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (!name) {
        throw errors.nonModuleDependecy(runtimeModule.name);
      }
      if (!this.runtimeModuleNames.includes(name)) {
        throw errors.unknownDependency(runtimeModule.name, name);
      }
    });

    this.decorateRuntimeModule(name);
  }

  /**
   * Sets if proofs are enabled or not
   * @param areProofsEnabled
   */
  public setProofsEnabled(areProofsEnabled: boolean) {
    this.areProofsEnabled = areProofsEnabled;
  }

  /**
   * Precompiles the current runtime modules into a ZkProgram.
   *
   * @returns - Analysis of the precompiled ZkProgram
   */
  public precompile() {
    type Methods = Parameters<typeof Experimental.ZkProgram>[0]["methods"];
    const methods = this.runtimeModuleNames.reduce<Methods>(
      (allMethods, runtimeModuleName) => {
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        const runtimeModule = this.getRuntimeModule(
          runtimeModuleName
        ) as RuntimeModule<unknown>;

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
                "design:paramtypes",
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

    function analyze(this: Runtime<RuntimeModules>) {
      if (!this.program) {
        throw errors.unableToAnalyze(this.constructor.name);
      }
      const zkProgramAnalysis = this.program.analyzeMethods();
      return Object.keys(sortedMethods).map((methodName, index) => {
        const { rows, gates } = zkProgramAnalysis[index];
        const { privateInputs: inputs } = sortedMethods[methodName];
        return {
          methodName,

          analysis: {
            rows,
            gates,
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

            console.log(`
Method: ${methodName}
Rows: ${methodAnalysis.rows},
Gates: ${methodAnalysis.gates.length}
Inputs: [${inputs.join(", ")}]
`);
          }
        );
      },
    };
  }

  public getProofClass(): Subclass<typeof Proof<MethodPublicInput>> {
    if (this.program === undefined) {
      throw errors.precompileFirst();
    }
    const { program } = this;

    return ((programClosure: { name: string }) =>
      class AppChainProof extends Proof<MethodPublicInput> {
        public static publicInputType = MethodPublicInput;

        public static tag = () => programClosure;
      })(program);
  }

  public config(
    config: RemoveUndefinedKeys<ComponentConfig<ResolvedRuntimeModules<ChainRuntimeModules>>>
  ): void {
    const allModules = this.getAllRuntimeModules();
    this.currentConfig = this.applyConfig(allModules, this.currentConfig, config);
  }

  /**
   * Compiles the current runtime modules configuration
   * into a ZkProgram and then into a verification key.
   *
   * @returns The resulting artifact of ZkProgram compilation (verification key)
   */
  public async compile() {
    this.precompile();
    if (!this.program) {
      throw errors.zkProgramMissing();
    }
    const { areProofsEnabled, program } = this;

    this.setProofsEnabled(false);
    const artifact = await program.compile();

    this.setProofsEnabled(areProofsEnabled);

    return artifact;
  }
}
