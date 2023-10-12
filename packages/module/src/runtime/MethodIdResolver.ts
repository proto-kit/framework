import { stringToField } from "@proto-kit/protocol";
import { Poseidon } from "snarkyjs";

import type { Runtime, RuntimeModulesRecord } from "./Runtime";

/**
 * Please see `getMethodId` to learn more about
 * methodId encoding
 */
export class MethodIdResolver {
  private readonly dictionary: {
    [key: string]: { moduleName: string; methodName: string };
  } = {};

  public constructor(
    private readonly runtime: Runtime<RuntimeModulesRecord>,
    private readonly modules: RuntimeModulesRecord
  ) {
    this.dictionary = runtime.runtimeModuleNames.reduce<
      Record<string, { moduleName: string; methodName: string }>
    >((dict, moduleName) => {
      this.runtime.assertIsValidModuleName(modules, moduleName);

      runtime.resolve(moduleName).runtimeMethodNames.forEach((methodName) => {
        dict[this.getMethodId(moduleName, methodName).toString()] = {
          moduleName,
          methodName,
        };
      });

      return dict;
    }, {});
  }

  public getMethodNameFromId(methodId: bigint): [string, string] | undefined {
    const { moduleName, methodName } = this.dictionary[methodId.toString()];

    // eslint-disable-next-line no-warning-comments
    // TODO Replace by throwing exception?
    if (moduleName === undefined || methodName === undefined) {
      return undefined;
    }

    this.runtime.assertIsValidModuleName(this.modules, moduleName);

    return [moduleName, methodName];
  }

  public getMethodId(moduleName: string, methodName: string): bigint {
    this.runtime.assertIsValidModuleName(this.modules, moduleName);

    return Poseidon.hash([
      stringToField(moduleName),
      stringToField(methodName),
    ]).toBigInt();
  }
}
