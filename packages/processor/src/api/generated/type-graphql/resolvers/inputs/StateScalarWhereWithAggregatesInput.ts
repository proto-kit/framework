import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { DecimalNullableListFilter } from "../inputs/DecimalNullableListFilter";
import { DecimalWithAggregatesFilter } from "../inputs/DecimalWithAggregatesFilter";
import { StringWithAggregatesFilter } from "../inputs/StringWithAggregatesFilter";

@TypeGraphQL.InputType("StateScalarWhereWithAggregatesInput", {})
export class StateScalarWhereWithAggregatesInput {
  @TypeGraphQL.Field(_type => [StateScalarWhereWithAggregatesInput], {
    nullable: true
  })
  AND?: StateScalarWhereWithAggregatesInput[] | undefined;

  @TypeGraphQL.Field(_type => [StateScalarWhereWithAggregatesInput], {
    nullable: true
  })
  OR?: StateScalarWhereWithAggregatesInput[] | undefined;

  @TypeGraphQL.Field(_type => [StateScalarWhereWithAggregatesInput], {
    nullable: true
  })
  NOT?: StateScalarWhereWithAggregatesInput[] | undefined;

  @TypeGraphQL.Field(_type => DecimalWithAggregatesFilter, {
    nullable: true
  })
  path?: DecimalWithAggregatesFilter | undefined;

  @TypeGraphQL.Field(_type => DecimalNullableListFilter, {
    nullable: true
  })
  values?: DecimalNullableListFilter | undefined;

  @TypeGraphQL.Field(_type => StringWithAggregatesFilter, {
    nullable: true
  })
  mask?: StringWithAggregatesFilter | undefined;
}
