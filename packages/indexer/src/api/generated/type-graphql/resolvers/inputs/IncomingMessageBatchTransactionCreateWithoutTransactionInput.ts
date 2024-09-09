import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { IncomingMessageBatchCreateNestedOneWithoutMessagesInput } from "../inputs/IncomingMessageBatchCreateNestedOneWithoutMessagesInput";

@TypeGraphQL.InputType("IncomingMessageBatchTransactionCreateWithoutTransactionInput", {})
export class IncomingMessageBatchTransactionCreateWithoutTransactionInput {
  @TypeGraphQL.Field(_type => IncomingMessageBatchCreateNestedOneWithoutMessagesInput, {
    nullable: false
  })
  batch!: IncomingMessageBatchCreateNestedOneWithoutMessagesInput;
}
