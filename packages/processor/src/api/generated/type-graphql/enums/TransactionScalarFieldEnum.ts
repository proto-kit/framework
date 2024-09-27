import * as TypeGraphQL from "type-graphql";

export enum TransactionScalarFieldEnum {
  hash = "hash",
  methodId = "methodId",
  sender = "sender",
  nonce = "nonce",
  argsFields = "argsFields",
  auxiliaryData = "auxiliaryData",
  signature_r = "signature_r",
  signature_s = "signature_s",
  isMessage = "isMessage"
}
TypeGraphQL.registerEnumType(TransactionScalarFieldEnum, {
  name: "TransactionScalarFieldEnum",
  description: undefined,
});
