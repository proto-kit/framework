import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { IntWithAggregatesFilter } from "../inputs/IntWithAggregatesFilter";
import { JsonWithAggregatesFilter } from "../inputs/JsonWithAggregatesFilter";
import { StringNullableWithAggregatesFilter } from "../inputs/StringNullableWithAggregatesFilter";

@TypeGraphQL.InputType("BatchScalarWhereWithAggregatesInput", {})
export class BatchScalarWhereWithAggregatesInput {
  @TypeGraphQL.Field(_type => [BatchScalarWhereWithAggregatesInput], {
    nullable: true
  })
  AND?: BatchScalarWhereWithAggregatesInput[] | undefined;

  @TypeGraphQL.Field(_type => [BatchScalarWhereWithAggregatesInput], {
    nullable: true
  })
  OR?: BatchScalarWhereWithAggregatesInput[] | undefined;

  @TypeGraphQL.Field(_type => [BatchScalarWhereWithAggregatesInput], {
    nullable: true
  })
  NOT?: BatchScalarWhereWithAggregatesInput[] | undefined;

  @TypeGraphQL.Field(_type => IntWithAggregatesFilter, {
    nullable: true
  })
  height?: IntWithAggregatesFilter | undefined;

  @TypeGraphQL.Field(_type => JsonWithAggregatesFilter, {
    nullable: true
  })
  proof?: JsonWithAggregatesFilter | undefined;

  @TypeGraphQL.Field(_type => StringNullableWithAggregatesFilter, {
    nullable: true
  })
  settlementTransactionHash?: StringNullableWithAggregatesFilter | undefined;
}
