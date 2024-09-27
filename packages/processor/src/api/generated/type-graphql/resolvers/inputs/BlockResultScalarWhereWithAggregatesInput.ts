import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { JsonWithAggregatesFilter } from "../inputs/JsonWithAggregatesFilter";
import { StringWithAggregatesFilter } from "../inputs/StringWithAggregatesFilter";

@TypeGraphQL.InputType("BlockResultScalarWhereWithAggregatesInput", {})
export class BlockResultScalarWhereWithAggregatesInput {
  @TypeGraphQL.Field(_type => [BlockResultScalarWhereWithAggregatesInput], {
    nullable: true
  })
  AND?: BlockResultScalarWhereWithAggregatesInput[] | undefined;

  @TypeGraphQL.Field(_type => [BlockResultScalarWhereWithAggregatesInput], {
    nullable: true
  })
  OR?: BlockResultScalarWhereWithAggregatesInput[] | undefined;

  @TypeGraphQL.Field(_type => [BlockResultScalarWhereWithAggregatesInput], {
    nullable: true
  })
  NOT?: BlockResultScalarWhereWithAggregatesInput[] | undefined;

  @TypeGraphQL.Field(_type => StringWithAggregatesFilter, {
    nullable: true
  })
  blockHash?: StringWithAggregatesFilter | undefined;

  @TypeGraphQL.Field(_type => StringWithAggregatesFilter, {
    nullable: true
  })
  stateRoot?: StringWithAggregatesFilter | undefined;

  @TypeGraphQL.Field(_type => StringWithAggregatesFilter, {
    nullable: true
  })
  blockHashRoot?: StringWithAggregatesFilter | undefined;

  @TypeGraphQL.Field(_type => JsonWithAggregatesFilter, {
    nullable: true
  })
  afterNetworkState?: JsonWithAggregatesFilter | undefined;

  @TypeGraphQL.Field(_type => JsonWithAggregatesFilter, {
    nullable: true
  })
  blockStateTransitions?: JsonWithAggregatesFilter | undefined;

  @TypeGraphQL.Field(_type => JsonWithAggregatesFilter, {
    nullable: true
  })
  blockHashWitness?: JsonWithAggregatesFilter | undefined;
}
