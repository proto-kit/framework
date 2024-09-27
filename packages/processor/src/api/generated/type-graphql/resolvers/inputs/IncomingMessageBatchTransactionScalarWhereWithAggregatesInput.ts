import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { IntWithAggregatesFilter } from "../inputs/IntWithAggregatesFilter";
import { StringWithAggregatesFilter } from "../inputs/StringWithAggregatesFilter";

@TypeGraphQL.InputType("IncomingMessageBatchTransactionScalarWhereWithAggregatesInput", {})
export class IncomingMessageBatchTransactionScalarWhereWithAggregatesInput {
  @TypeGraphQL.Field(_type => [IncomingMessageBatchTransactionScalarWhereWithAggregatesInput], {
    nullable: true
  })
  AND?: IncomingMessageBatchTransactionScalarWhereWithAggregatesInput[] | undefined;

  @TypeGraphQL.Field(_type => [IncomingMessageBatchTransactionScalarWhereWithAggregatesInput], {
    nullable: true
  })
  OR?: IncomingMessageBatchTransactionScalarWhereWithAggregatesInput[] | undefined;

  @TypeGraphQL.Field(_type => [IncomingMessageBatchTransactionScalarWhereWithAggregatesInput], {
    nullable: true
  })
  NOT?: IncomingMessageBatchTransactionScalarWhereWithAggregatesInput[] | undefined;

  @TypeGraphQL.Field(_type => StringWithAggregatesFilter, {
    nullable: true
  })
  transactionHash?: StringWithAggregatesFilter | undefined;

  @TypeGraphQL.Field(_type => IntWithAggregatesFilter, {
    nullable: true
  })
  batchId?: IntWithAggregatesFilter | undefined;
}
