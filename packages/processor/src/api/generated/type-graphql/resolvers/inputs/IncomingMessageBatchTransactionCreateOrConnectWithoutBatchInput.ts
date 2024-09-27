import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { IncomingMessageBatchTransactionCreateWithoutBatchInput } from "../inputs/IncomingMessageBatchTransactionCreateWithoutBatchInput";
import { IncomingMessageBatchTransactionWhereUniqueInput } from "../inputs/IncomingMessageBatchTransactionWhereUniqueInput";

@TypeGraphQL.InputType("IncomingMessageBatchTransactionCreateOrConnectWithoutBatchInput", {})
export class IncomingMessageBatchTransactionCreateOrConnectWithoutBatchInput {
  @TypeGraphQL.Field(_type => IncomingMessageBatchTransactionWhereUniqueInput, {
    nullable: false
  })
  where!: IncomingMessageBatchTransactionWhereUniqueInput;

  @TypeGraphQL.Field(_type => IncomingMessageBatchTransactionCreateWithoutBatchInput, {
    nullable: false
  })
  create!: IncomingMessageBatchTransactionCreateWithoutBatchInput;
}
