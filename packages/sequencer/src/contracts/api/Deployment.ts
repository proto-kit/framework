import { AST } from "../ast/AST";
import {
  AppchainContract,
  contractMethodNamesMetadataKey,
} from "./SmartContract";
import { ASTBuilder } from "../ast/ASTBuilder";
import { injectable, container } from "tsyringe";
import {
  DefaultInstructions,
  DefaultInstructionsProxy,
} from "../ast/proxies/DefaultInstructions";
import { OpcodeDefinitions, ProxyInstructions } from "../ast/types";
import { ASTRecorder } from "../ast/ASTRecorder";
import { ASTReplayer } from "../ast/ASTReplayer";
import { mapSequential } from "@proto-kit/common";
import { Provable, Field, VerificationKey } from "o1js";
import { MethodParameterEncoder } from "@proto-kit/module";

type ContractMethod<Inputs, Outputs> = {
  name: string;
  ast: AST<any, Inputs, Outputs>;
};

export type ContractArtifact = {
  contracts: Record<string, ContractMethod<unknown, unknown>>;
  vk: {
    data: string;
    hash: string;
  };
};

function getContractMethodNames<T extends AppchainContract>(
  contract: T
): (keyof T)[] {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const data: (keyof T)[] | undefined = Reflect.getMetadata(
    contractMethodNamesMetadataKey,
    contract.constructor
  );

  if (data === undefined) {
    throw new Error("No Methods defined on contract");
  }

  return data;
}

@injectable()
export class GlobalASTProxy {
  public recorder?: ASTRecorder<any>;
  public executor?: ASTReplayer<any>;

  public proxy<Instructions extends OpcodeDefinitions>(
    instructions: Instructions,
    proxyInstructions: ProxyInstructions<Instructions>
  ) {
    if (this.recorder !== undefined && this.executor !== undefined) {
      return { recorder: this.recorder, executor: this.executor };
    }
    const builder = new ASTBuilder(instructions);
    const services = builder.initialize(proxyInstructions);
    this.recorder = services.recorder;
    this.executor = services.executor;
    return services;
  }
}

export async function deployContract<T extends AppchainContract>(contract: T) {
  const methods = getContractMethodNames(contract);

  const proxy = container.resolve(GlobalASTProxy);
  const { recorder } = proxy.proxy(
    DefaultInstructions,
    DefaultInstructionsProxy
  );

  mapSequential(methods, async (methodName) => {
    const method = contract[methodName];

    const paramTypes = Reflect.getMetadata('design:paramtypes', contract.constructor, methodName as string);

    // MethodParameterEncoder

    const ast = await recorder.captureExecution(method);


  })

}

// export async

export function callContract(id: Field, vK: VerificationKey, params: any[]) {

}
