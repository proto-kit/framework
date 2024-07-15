import * as TypeGraphQL from "type-graphql";

export enum BalanceScalarFieldEnum {
  height = "height",
  address = "address",
  balance = "balance"
}
TypeGraphQL.registerEnumType(BalanceScalarFieldEnum, {
  name: "BalanceScalarFieldEnum",
  description: undefined,
});
