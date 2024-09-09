import * as TypeGraphQL from "type-graphql";

export enum BatchScalarFieldEnum {
  height = "height",
  proof = "proof",
  settlementTransactionHash = "settlementTransactionHash"
}
TypeGraphQL.registerEnumType(BatchScalarFieldEnum, {
  name: "BatchScalarFieldEnum",
  description: undefined,
});
