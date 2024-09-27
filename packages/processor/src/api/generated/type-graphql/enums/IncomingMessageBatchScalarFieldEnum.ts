import * as TypeGraphQL from "type-graphql";

export enum IncomingMessageBatchScalarFieldEnum {
  id = "id",
  fromMessageHash = "fromMessageHash",
  toMessageHash = "toMessageHash"
}
TypeGraphQL.registerEnumType(IncomingMessageBatchScalarFieldEnum, {
  name: "IncomingMessageBatchScalarFieldEnum",
  description: undefined,
});
