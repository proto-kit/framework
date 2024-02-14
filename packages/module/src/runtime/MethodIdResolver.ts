import { stringToField } from "@proto-kit/protocol";
import { Poseidon } from "o1js";
import { inject, injectable } from "tsyringe";

import type { Runtime, RuntimeModulesRecord } from "./Runtime";

/**
 * Please see `getMethodId` to learn more about
 * methodId encoding
 */
@injectable()
export class MethodIdResolver {
  private readonly dictionary: {
    [key: string]: { moduleName: string; methodName: string };
  } = {};

  public constructor(
    @inject("Runtime") private readonly runtime: Runtime<RuntimeModulesRecord>
  ) {
    this.dictionary = runtime.runtimeModuleNames.reduce<
      Record<string, { moduleName: string; methodName: string }>
    >((dict, moduleName) => {
      this.runtime.assertIsValidModuleName(moduleName);

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
    const methodPath = this.dictionary[methodId.toString()];

    if (methodPath === undefined) {
      return undefined;
    }

    const { moduleName, methodName } = methodPath;

    this.runtime.assertIsValidModuleName(moduleName);

    return [moduleName, methodName];
  }

  public getMethodId(moduleName: string, methodName: string): bigint {
    this.runtime.assertIsValidModuleName(moduleName);

    return Poseidon.hash([
      stringToField(moduleName),
      stringToField(methodName),
    ]).toBigInt();
  }
}
