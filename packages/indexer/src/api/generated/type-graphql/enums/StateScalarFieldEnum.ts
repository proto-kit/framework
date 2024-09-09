import * as TypeGraphQL from "type-graphql";

export enum StateScalarFieldEnum {
  path = "path",
  values = "values",
  mask = "mask"
}
TypeGraphQL.registerEnumType(StateScalarFieldEnum, {
  name: "StateScalarFieldEnum",
  description: undefined,
});
