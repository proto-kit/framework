import { Struct, Field, Bool } from "o1js";
import {
  RuntimeTransaction,
  NetworkState,
  RuntimeMethodExecutionDataStruct,
} from "@proto-kit/protocol";

import { AST } from "../ast/AST";
import { ASTReplayer } from "../ast/ASTReplayer";
import { container } from "tsyringe";
import { ContractExecutionContext } from "./ContractExecutionContext";
import { toStateTransitionsHash } from "@proto-kit/module";

export class ContractInputs extends Struct({
  contextInputs: RuntimeMethodExecutionDataStruct,
}) {}

export class ContractOutputs extends Struct({
  transactionHash: Field,
  networkStateHash: Field,
  stateTransitionsHash: Field,
  status: Bool,
}) {}

export function contractMethodWrapper(
  ast: AST<any>,
  replayer: ASTReplayer<any>
) {
  return async (
    startingStateTransitionsHash: Field,
    contextInputs: RuntimeMethodExecutionDataStruct
  ): Promise<ContractOutputs> => {
    const context = container.resolve(ContractExecutionContext);
    context.setup(contextInputs);

    const { transaction, networkState } = contextInputs;

    await replayer.executeCircuitFromAST(
      ast,
      {
        contextInputs,
      },
      ContractInputs,
      ContractOutputs
    );

    const { status, stateTransitions } = context.result;

    const stateTransitionsHash = toStateTransitionsHash(
      stateTransitions,
      startingStateTransitionsHash
    );

    // TODO Leak STList preimage and preimage value to the outside

    return new ContractOutputs({
      stateTransitionsHash,
      status,
      networkStateHash: networkState.hash(),
      transactionHash: transaction.hash(),
    });
  };
}
