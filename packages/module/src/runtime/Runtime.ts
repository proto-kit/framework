// eslint-disable-next-line max-len
/* eslint-disable @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment */
import { Experimental, Proof } from "snarkyjs";
import { MethodPublicInput, Subclass } from "@yab/protocol";
import {
  ModuleContainer,
  ModulesConfig,
  ModulesRecord,
  TypedClassConstructor,
} from "@yab/common";

import {
  combineMethodName,
  isMethod,
  toWrappedMethod,
} from "../method/decorator.js";
import { StateService } from "../state/InMemoryStateService.js";

import { RuntimeModule } from "./RuntimeModule.js";

/**
 * Record of modules accepted by the Runtime module container.
 *
 * We have to use TypedClassConstructor since RuntimeModule
 * is an abstract class
 */
export type RuntimeModulesRecord = ModulesRecord<
  TypedClassConstructor<RuntimeModule<unknown>>
>;

/**
 * Definition / required arguments for the Runtime class
 */
export interface RuntimeDefinition<
  Modules extends RuntimeModulesRecord,
  Config extends ModulesConfig<Modules>
> {
  state: StateService;
  modules: Modules;
  config?: Config;
}

const errors = {
  onlyStringNames: () => new TypeError("Only string names are supported"),

  missingDecorator: (name: string, runtimeModuleName: string) =>
    new Error(
      `Unable to register module: ${name} / ${runtimeModuleName},
      did you forget to add @runtimeModule()?`
    ),

  unableToAnalyze: (name: string) =>
    new Error(`Unable to analyze program for runtime: ${name}`),

  precompileFirst: () =>
    new Error(
      "You have to call precompile() before being able to create the proof class"
    ),

  zkProgramMissing: () =>
    new Error(
      "Unable to compile runtime, pre-compilation did not produce a zkProgram"
    ),
};

/**
 * Wrapper for an application specific runtime, which helps orchestrate
 * runtime modules into an interoperable runtime.
 */
export class Runtime<
  Modules extends RuntimeModulesRecord = RuntimeModulesRecord,
  Config extends ModulesConfig<Modules> = ModulesConfig<Modules>
> extends ModuleContainer<Modules, Config> {
  /**
   * Alternative constructor for `Runtime`.
   *
   * @param config - Configuration for the returned Runtime
   * @returns Runtime with the provided config
   */
  public static from<
    Modules extends RuntimeModulesRecord,
    Config extends ModulesConfig<Modules>
  >(definition: RuntimeDefinition<Modules, Config>) {
    return new Runtime(definition);
  }

  // determines whether any proving should be done when running methods
  public areProofsEnabled = false;

  // runtime modules composed into a ZkProgram
  public program?: ReturnType<typeof Experimental.ZkProgram>;

  public definition: RuntimeDefinition<Modules, Config>;

  /**
   * Creates a new Runtime from the provided config
   *
   * @param modules - Configuration object for the constructed Runtime
   */
  public constructor(definition: RuntimeDefinition<Modules, Config>) {
    super(definition);
    this.definition = definition;
  }

  /**
   * Add a name and other respective properties required by RuntimeModules,
   * that come from the current Runtime
   *
   * @param name - Name of the runtime module to decorate
   */
  public override decorateModule<ModuleName extends keyof Modules>(
    moduleName: ModuleName | string,
    containedModule: InstanceType<Modules[ModuleName]>
  ) {
    containedModule.name = this.moduleNameToString(moduleName);
    containedModule.runtime = this;

    super.decorateModule(moduleName, containedModule);
  }

  /**
   * @returns A list of names of all the registered module names
   */
  public get runtimeModuleNames() {
    return Object.keys(this.definition.modules);
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
        const runtimeModule = this.resolve(runtimeModuleName);

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

              const privateInputs = Reflect.getMetadata(
                "design:paramtypes",
                runtimeModule,
                methodName
              );

              return {
                ...allModuleMethods,

                [combinedMethodName]: {
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

    function analyze(this: Runtime) {
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
              // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/consistent-type-assertions
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
