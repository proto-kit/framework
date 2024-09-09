import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { IncomingMessageBatchTransactionWhereInput } from "../inputs/IncomingMessageBatchTransactionWhereInput";

@TypeGraphQL.InputType("IncomingMessageBatchTransactionListRelationFilter", {})
export class IncomingMessageBatchTransactionListRelationFilter {
  @TypeGraphQL.Field(_type => IncomingMessageBatchTransactionWhereInput, {
    nullable: true
  })
  every?: IncomingMessageBatchTransactionWhereInput | undefined;

  @TypeGraphQL.Field(_type => IncomingMessageBatchTransactionWhereInput, {
    nullable: true
  })
  some?: IncomingMessageBatchTransactionWhereInput | undefined;

  @TypeGraphQL.Field(_type => IncomingMessageBatchTransactionWhereInput, {
    nullable: true
  })
  none?: IncomingMessageBatchTransactionWhereInput | undefined;
}
