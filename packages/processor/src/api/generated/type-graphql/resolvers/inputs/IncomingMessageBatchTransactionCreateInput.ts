import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { IncomingMessageBatchCreateNestedOneWithoutMessagesInput } from "../inputs/IncomingMessageBatchCreateNestedOneWithoutMessagesInput";
import { TransactionCreateNestedOneWithoutIncomingMessageBatchTransactionInput } from "../inputs/TransactionCreateNestedOneWithoutIncomingMessageBatchTransactionInput";

@TypeGraphQL.InputType("IncomingMessageBatchTransactionCreateInput", {})
export class IncomingMessageBatchTransactionCreateInput {
  @TypeGraphQL.Field(_type => TransactionCreateNestedOneWithoutIncomingMessageBatchTransactionInput, {
    nullable: false
  })
  transaction!: TransactionCreateNestedOneWithoutIncomingMessageBatchTransactionInput;

  @TypeGraphQL.Field(_type => IncomingMessageBatchCreateNestedOneWithoutMessagesInput, {
    nullable: false
  })
  batch!: IncomingMessageBatchCreateNestedOneWithoutMessagesInput;
}
