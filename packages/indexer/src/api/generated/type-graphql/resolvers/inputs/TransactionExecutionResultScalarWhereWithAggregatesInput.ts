import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BoolWithAggregatesFilter } from "../inputs/BoolWithAggregatesFilter";
import { JsonWithAggregatesFilter } from "../inputs/JsonWithAggregatesFilter";
import { StringNullableWithAggregatesFilter } from "../inputs/StringNullableWithAggregatesFilter";
import { StringWithAggregatesFilter } from "../inputs/StringWithAggregatesFilter";

@TypeGraphQL.InputType("TransactionExecutionResultScalarWhereWithAggregatesInput", {})
export class TransactionExecutionResultScalarWhereWithAggregatesInput {
  @TypeGraphQL.Field(_type => [TransactionExecutionResultScalarWhereWithAggregatesInput], {
    nullable: true
  })
  AND?: TransactionExecutionResultScalarWhereWithAggregatesInput[] | undefined;

  @TypeGraphQL.Field(_type => [TransactionExecutionResultScalarWhereWithAggregatesInput], {
    nullable: true
  })
  OR?: TransactionExecutionResultScalarWhereWithAggregatesInput[] | undefined;

  @TypeGraphQL.Field(_type => [TransactionExecutionResultScalarWhereWithAggregatesInput], {
    nullable: true
  })
  NOT?: TransactionExecutionResultScalarWhereWithAggregatesInput[] | undefined;

  @TypeGraphQL.Field(_type => JsonWithAggregatesFilter, {
    nullable: true
  })
  stateTransitions?: JsonWithAggregatesFilter | undefined;

  @TypeGraphQL.Field(_type => JsonWithAggregatesFilter, {
    nullable: true
  })
  protocolTransitions?: JsonWithAggregatesFilter | undefined;

  @TypeGraphQL.Field(_type => BoolWithAggregatesFilter, {
    nullable: true
  })
  status?: BoolWithAggregatesFilter | undefined;

  @TypeGraphQL.Field(_type => StringNullableWithAggregatesFilter, {
    nullable: true
  })
  statusMessage?: StringNullableWithAggregatesFilter | undefined;

  @TypeGraphQL.Field(_type => StringWithAggregatesFilter, {
    nullable: true
  })
  txHash?: StringWithAggregatesFilter | undefined;

  @TypeGraphQL.Field(_type => StringWithAggregatesFilter, {
    nullable: true
  })
  blockHash?: StringWithAggregatesFilter | undefined;
}
