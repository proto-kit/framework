// eslint-disable-next-line max-len
/* eslint-disable @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-assignment */
import { Experimental } from "snarkyjs";
import { injectable } from "tsyringe";
import {
  StringKeyOf,
  ModuleContainer,
  ModulesConfig,
  ModulesRecord,
  TypedClass,
  ZkProgrammable,
  PlainZkProgram,
  WithZkProgrammable,
  AreProofsEnabled,
  log,
} from "@yab/common";

import {
  combineMethodName,
  isRuntimeMethod,
  MethodPublicOutput,
  toWrappedMethod,
  WrappedMethod,
} from "../method/runtimeMethod.js";
import { StateService } from "../state/InMemoryStateService.js";

import { RuntimeModule } from "./RuntimeModule.js";

/**
 * Record of modules accepted by the Runtime module container.
 *
 * We have to use TypedClass since RuntimeModule
 * is an abstract class
 */
export type RuntimeModulesRecord = ModulesRecord<
  TypedClass<RuntimeModule<unknown>>
>;

/**
 * Definition / required arguments for the Runtime class
 */
export interface RuntimeDefinition<Modules extends RuntimeModulesRecord> {
  state: StateService;
  modules: Modules;
  config?: ModulesConfig<Modules>;
}

export class RuntimeZkProgrammable<
  Modules extends RuntimeModulesRecord
> extends ZkProgrammable<undefined, MethodPublicOutput> {
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  public constructor(public runtime: Runtime<Modules>) {
    super();
  }

  public get appChain() {
    return this.runtime.appChain;
  }

  public zkProgramFactory(): PlainZkProgram<undefined, MethodPublicOutput> {
    type Methods = Record<
      string,
      {
        privateInputs: any;
        method: WrappedMethod;
      }
    >;
    const { runtime } = this;

    const runtimeMethods = runtime.runtimeModuleNames.reduce<Methods>(
      (allMethods, runtimeModuleName) => {
        runtime.isValidModuleName(
          runtime.definition.modules,
          runtimeModuleName
        );

        /**
         * Couldnt find a better way to circumvent the type assertion
         * regarding resolving only known modules. We assert in the line above
         * but we cast it to any anyways to satisfy the proof system.
         */
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        const runtimeModule = runtime.resolve(runtimeModuleName as any);

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
            // eslint-disable-next-line max-len
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/strict-boolean-expressions
            if (isRuntimeMethod(runtimeModule, methodName)) {
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

    const sortedRuntimeMethods = Object.fromEntries(
      // eslint-disable-next-line @typescript-eslint/require-array-sort-compare
      Object.entries(runtimeMethods).sort()
    );

    const program = Experimental.ZkProgram({
      publicOutput: MethodPublicOutput,
      methods: sortedRuntimeMethods,
    });

    const SelfProof = Experimental.ZkProgram.Proof(program);

    const methods = Object.keys(sortedRuntimeMethods).reduce<
      Record<string, any>
    >((boundMethods, methodName) => {
      boundMethods[methodName] = program[methodName].bind(program);
      return boundMethods;
    }, {});

    return {
      compile: program.compile.bind(program),
      verify: program.verify.bind(program),
      Proof: SelfProof,
      methods,
      analyze,

      toPretty: () => {
        Reflect.apply(analyze, this, []).forEach(
          ({ methodName, analysis: methodAnalysis }) => {
            const inputs = methodAnalysis.inputs.map(
              // eslint-disable-next-line max-len
              // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/consistent-type-assertions
              (input) => (input as any).name
            );

            log.info(`
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
}

/**
 * Wrapper for an application specific runtime, which helps orchestrate
 * runtime modules into an interoperable runtime.
 */
@injectable()
export class Runtime<Modules extends RuntimeModulesRecord>
  extends ModuleContainer<Modules>
  implements WithZkProgrammable<undefined, MethodPublicOutput>
{
  public static from<Modules extends RuntimeModulesRecord>(
    definition: RuntimeDefinition<Modules>
  ) {
    return new Runtime(definition);
  }

  // runtime modules composed into a ZkProgram
  public program?: ReturnType<typeof Experimental.ZkProgram>;

  public appChain?: AreProofsEnabled;

  public definition: RuntimeDefinition<Modules>;

  public zkProgrammable: ZkProgrammable<undefined, MethodPublicOutput>;

  /**
   * Creates a new Runtime from the provided config
   *
   * @param modules - Configuration object for the constructed Runtime
   */
  public constructor(definition: RuntimeDefinition<Modules>) {
    super(definition);
    this.definition = definition;
    this.zkProgrammable = new RuntimeZkProgrammable<Modules>(this);
    // this.registerValue({
    //   Runtime: this,
    // });
  }

  /**
   * Add a name and other respective properties required by RuntimeModules,
   * that come from the current Runtime
   *
   * @param name - Name of the runtime module to decorate
   */
  public decorateModule(
    moduleName: StringKeyOf<Modules>,
    containedModule: InstanceType<Modules[StringKeyOf<Modules>]>
  ) {
    containedModule.name = moduleName;
    containedModule.runtime = this;

    super.decorateModule(moduleName, containedModule);
  }

  /**
   * @returns A list of names of all the registered module names
   */
  public get runtimeModuleNames() {
    return Object.keys(this.definition.modules);
  }
}
