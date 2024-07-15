import * as TypeGraphQL from "type-graphql";

export enum BlockScalarFieldEnum {
  height = "height",
  createdAt = "createdAt"
}
TypeGraphQL.registerEnumType(BlockScalarFieldEnum, {
  name: "BlockScalarFieldEnum",
  description: undefined,
});
