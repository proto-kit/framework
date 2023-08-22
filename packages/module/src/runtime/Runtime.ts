// eslint-disable-next-line max-len
/* eslint-disable @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-assignment */
import { Experimental } from "snarkyjs";
import { DependencyContainer, injectable } from "tsyringe";
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
} from "@proto-kit/common";
import {
  fieldToString,
  stringToField,
  MethodPublicOutput,
} from "@proto-kit/protocol";

import {
  combineMethodName,
  isRuntimeMethod,
  toWrappedMethod,
  WrappedMethod,
} from "../method/runtimeMethod.js";
import { StateService } from "../state/InMemoryStateService.js";
import { StateServiceProvider } from "../state/StateServiceProvider";

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

const errors = {
  methodNotFound: (methodKey: string) =>
    new Error(`Unable to find method with id ${methodKey}`),
};

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
    // We need to use explicit type annotations here,
    // therefore we can't use destructuring
    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/no-use-before-define,prefer-destructuring,putout/putout
    const runtime: Runtime<Modules> = this.runtime;

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

  public definition: RuntimeDefinition<Modules>;

  public zkProgrammable: ZkProgrammable<undefined, MethodPublicOutput>;

  // eslint-disable-next-line no-warning-comments
  // TODO DI
  private readonly stateServiceProviderInstance = new StateServiceProvider(
    this.definition.state
  );

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

  public get appChain(): AreProofsEnabled | undefined {
    return this.container.resolve<AreProofsEnabled>("AppChain");
  }

  public get stateService(): StateService {
    return this.stateServiceProviderInstance.stateService;
  }

  public get stateServiceProvider(): StateServiceProvider {
    return this.stateServiceProviderInstance;
  }

  /**
   * @returns The dependency injection container of this runtime
   */
  public get dependencyContainer(): DependencyContainer {
    return this.container;
  }

  /**
   * @param methodId The encoded name of the method to call.
   * Encoding: "stringToField(module.name) << 128 + stringToField(method-name)"
   */
  public getMethodById(methodId: bigint): (...args: unknown[]) => unknown {
    const [moduleName, methodName] = this.getMethodNameFromId(methodId);

    this.isValidModuleName(this.definition.modules, moduleName);
    const module = this.resolve(moduleName);

    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions,@typescript-eslint/no-unsafe-member-access
    const method = (module as any)[methodName];
    if (method === undefined) {
      throw errors.methodNotFound(`${moduleName}.${methodName}`);
    }

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return (method as (...args: unknown[]) => unknown).bind(module);
  }

  public getMethodNameFromId(methodId: bigint): [string, string] {
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    const moduleName = fieldToString(methodId >> 128n);
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    const methodName = fieldToString(methodId % 2n ** 128n);

    return [moduleName, methodName];
  }

  public getMethodId(moduleName: string, methodName: string): bigint {
    return (
      // eslint-disable-next-line @typescript-eslint/no-magic-numbers
      (stringToField(moduleName).toBigInt() << 128n) +
      stringToField(methodName).toBigInt()
    );
  }

  public test?: string;

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
