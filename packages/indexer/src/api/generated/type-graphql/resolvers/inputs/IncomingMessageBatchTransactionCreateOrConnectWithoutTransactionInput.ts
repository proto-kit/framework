import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { IncomingMessageBatchTransactionCreateWithoutTransactionInput } from "../inputs/IncomingMessageBatchTransactionCreateWithoutTransactionInput";
import { IncomingMessageBatchTransactionWhereUniqueInput } from "../inputs/IncomingMessageBatchTransactionWhereUniqueInput";

@TypeGraphQL.InputType("IncomingMessageBatchTransactionCreateOrConnectWithoutTransactionInput", {})
export class IncomingMessageBatchTransactionCreateOrConnectWithoutTransactionInput {
  @TypeGraphQL.Field(_type => IncomingMessageBatchTransactionWhereUniqueInput, {
    nullable: false
  })
  where!: IncomingMessageBatchTransactionWhereUniqueInput;

  @TypeGraphQL.Field(_type => IncomingMessageBatchTransactionCreateWithoutTransactionInput, {
    nullable: false
  })
  create!: IncomingMessageBatchTransactionCreateWithoutTransactionInput;
}
