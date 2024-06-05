import {
  RuntimeMethodExecutionData,
  RuntimeTransaction,
  NetworkState,
} from "@proto-kit/protocol";
import { container, injectable } from "tsyringe";

import { ContractExecutionContext } from "./ContractExecutionContext";
import { RuntimeModule } from "@proto-kit/module";
import { TypedClass } from "@proto-kit/common";

export abstract class AppchainContract {
  public getInputs(): RuntimeMethodExecutionData {
    const { input } = container.resolve<ContractExecutionContext>(
      ContractExecutionContext
    );
    if (input === undefined) {
      throw new Error("Input data not set");
    }
    return input;
  }

  public get transaction(): RuntimeTransaction {
    return this.getInputs().transaction;
  }

  public get network(): NetworkState {
    return this.getInputs().networkState;
  }
}

export const contractMethodNamesMetadataKey = "a"
export const contractMethodMetadataKey = "b"

export function contract() {
  return (
    /**
     * Check if the target class extends RuntimeModule, while
     * also providing static config presets
     */
    target: TypedClass<AppchainContract>
  ) => {
    injectable()(target);
  };
}

export function contractMethod() {
  return (
    target: AppchainContract,
    methodName: string,
    descriptor: TypedPropertyDescriptor<
      // TODO Limit possible parameter types
      (...args: any[]) => Promise<any>
    >
  ) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    let data: string[] | undefined = Reflect.getMetadata(
      contractMethodNamesMetadataKey,
      target
    );
    if (data !== undefined) {
      data.push(methodName);
    } else {
      data = [methodName];
    }
    Reflect.defineMetadata(contractMethodNamesMetadataKey, data, target);

    Reflect.defineMetadata(contractMethodMetadataKey, true, target, methodName);
  }
}

@contract()
class Test extends AppchainContract {
  @contractMethod()
  public async main() {

  }
}