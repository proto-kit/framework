import { filterNonUndefined } from "@proto-kit/common";
import { stringToField, RuntimeMethodIdMapping } from "@proto-kit/protocol";
import { Poseidon } from "o1js";
import { inject, injectable } from "tsyringe";

import {
  RuntimeMethodInvocationType,
  runtimeMethodTypeMetadataKey,
} from "../method/runtimeMethod";

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

  /**
   * The purpose of this method is to provide a dictionary where
   * we can look up properties like methodId and invocationType
   * for each runtimeMethod using their module name and method name
   */
  public methodIdMap(): RuntimeMethodIdMapping {
    const methodIdResolver =
      this.runtime.dependencyContainer.resolve<MethodIdResolver>(
        "MethodIdResolver"
      );

    const rawMappings = this.runtime.moduleNames.flatMap((moduleName) => {
      const module = this.runtime.resolve(moduleName);
      return module.runtimeMethodNames.map((method) => {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        const type = Reflect.getMetadata(
          runtimeMethodTypeMetadataKey,
          module,
          method
        ) as RuntimeMethodInvocationType | undefined;

        if (type !== undefined) {
          return {
            name: `${moduleName}.${method}`,
            methodId: methodIdResolver.getMethodId(moduleName, method),
            type,
          } as const;
        }

        return undefined;
      });
    });

    return rawMappings
      .filter(filterNonUndefined)
      .reduce<RuntimeMethodIdMapping>((acc, entry) => {
        acc[entry.name] = {
          methodId: entry.methodId,
          type: entry.type,
        };
        return acc;
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
