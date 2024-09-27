import * as TypeGraphQL from "type-graphql";

export enum BlockScalarFieldEnum {
  hash = "hash",
  transactionsHash = "transactionsHash",
  beforeNetworkState = "beforeNetworkState",
  duringNetworkState = "duringNetworkState",
  height = "height",
  fromEternalTransactionsHash = "fromEternalTransactionsHash",
  toEternalTransactionsHash = "toEternalTransactionsHash",
  fromBlockHashRoot = "fromBlockHashRoot",
  fromMessagesHash = "fromMessagesHash",
  toMessagesHash = "toMessagesHash",
  parentHash = "parentHash",
  batchHeight = "batchHeight"
}
TypeGraphQL.registerEnumType(BlockScalarFieldEnum, {
  name: "BlockScalarFieldEnum",
  description: undefined,
});
