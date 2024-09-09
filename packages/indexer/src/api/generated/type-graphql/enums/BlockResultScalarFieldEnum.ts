import * as TypeGraphQL from "type-graphql";

export enum BlockResultScalarFieldEnum {
  blockHash = "blockHash",
  stateRoot = "stateRoot",
  blockHashRoot = "blockHashRoot",
  afterNetworkState = "afterNetworkState",
  blockStateTransitions = "blockStateTransitions",
  blockHashWitness = "blockHashWitness"
}
TypeGraphQL.registerEnumType(BlockResultScalarFieldEnum, {
  name: "BlockResultScalarFieldEnum",
  description: undefined,
});
