import * as TypeGraphQL from "type-graphql";

export enum TransactionExecutionResultScalarFieldEnum {
  stateTransitions = "stateTransitions",
  protocolTransitions = "protocolTransitions",
  status = "status",
  statusMessage = "statusMessage",
  txHash = "txHash",
  blockHash = "blockHash"
}
TypeGraphQL.registerEnumType(TransactionExecutionResultScalarFieldEnum, {
  name: "TransactionExecutionResultScalarFieldEnum",
  description: undefined,
});
