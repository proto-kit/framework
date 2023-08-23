import { singleFieldToString, stringToField } from "@proto-kit/protocol";

import type { Runtime, RuntimeModulesRecord } from "./Runtime";

const offset = 128n;
// eslint-disable-next-line @typescript-eslint/no-magic-numbers
const modulus = 2n ** (offset - 1n);

/**
 * How do we encode MethodIds
 * A MethodId is defined as the following in little-endian
 * [0
 *   ...hash(stringToField(moduleName))[0..128],
 *   ...hash(stringToField(methodName))[0..128]
 * ]
 */
export class MethodIdResolver {
  private readonly dictionary: { [key: string]: string } = {};

  public constructor(
    private readonly runtime: Runtime<RuntimeModulesRecord>,
    private readonly modules: RuntimeModulesRecord
  ) {
    this.dictionary = runtime.runtimeModuleNames.reduce<Record<string, string>>(
      (dict, moduleName) => {
        this.runtime.assertIsValidModuleName(modules, moduleName);

        dict[(stringToField(moduleName).toBigInt() % modulus).toString()] =
          moduleName;

        runtime.resolve(moduleName).runtimeMethodNames.forEach((methodName) => {
          dict[(stringToField(methodName).toBigInt() % modulus).toString()] =
            methodName;
        });
        return dict;
      },
      {}
    );
  }

  public getMethodNameFromId(methodId: bigint): [string, string] | undefined {
    const moduleNameHash = singleFieldToString(methodId >> offset);
    const methodNameHash = singleFieldToString(methodId % modulus);

    const moduleName: string | undefined = this.dictionary[moduleNameHash];

    // eslint-disable-next-line no-warning-comments
    // TODO Replace by throwing exception?
    if (moduleName === undefined) {
      return undefined;
    }
    this.runtime.assertIsValidModuleName(this.modules, moduleName);

    const methodName: string | undefined = this.dictionary[methodNameHash];

    if (methodName === undefined) {
      return undefined;
    }

    return [moduleName, methodName];
  }

  public getMethodId(moduleName: string, methodName: string): bigint {
    this.runtime.assertIsValidModuleName(this.modules, moduleName);

    return (
      (stringToField(moduleName).toBigInt() % modulus << offset) +
      (stringToField(methodName).toBigInt() % modulus)
    );
  }
}
