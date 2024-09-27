import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { IntWithAggregatesFilter } from "../inputs/IntWithAggregatesFilter";
import { StringWithAggregatesFilter } from "../inputs/StringWithAggregatesFilter";

@TypeGraphQL.InputType("IncomingMessageBatchScalarWhereWithAggregatesInput", {})
export class IncomingMessageBatchScalarWhereWithAggregatesInput {
  @TypeGraphQL.Field(_type => [IncomingMessageBatchScalarWhereWithAggregatesInput], {
    nullable: true
  })
  AND?: IncomingMessageBatchScalarWhereWithAggregatesInput[] | undefined;

  @TypeGraphQL.Field(_type => [IncomingMessageBatchScalarWhereWithAggregatesInput], {
    nullable: true
  })
  OR?: IncomingMessageBatchScalarWhereWithAggregatesInput[] | undefined;

  @TypeGraphQL.Field(_type => [IncomingMessageBatchScalarWhereWithAggregatesInput], {
    nullable: true
  })
  NOT?: IncomingMessageBatchScalarWhereWithAggregatesInput[] | undefined;

  @TypeGraphQL.Field(_type => IntWithAggregatesFilter, {
    nullable: true
  })
  id?: IntWithAggregatesFilter | undefined;

  @TypeGraphQL.Field(_type => StringWithAggregatesFilter, {
    nullable: true
  })
  fromMessageHash?: StringWithAggregatesFilter | undefined;

  @TypeGraphQL.Field(_type => StringWithAggregatesFilter, {
    nullable: true
  })
  toMessageHash?: StringWithAggregatesFilter | undefined;
}
