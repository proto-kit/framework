import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { DecimalFilter } from "../inputs/DecimalFilter";
import { DecimalNullableListFilter } from "../inputs/DecimalNullableListFilter";
import { StringFilter } from "../inputs/StringFilter";

@TypeGraphQL.InputType("StateWhereInput", {})
export class StateWhereInput {
  @TypeGraphQL.Field(_type => [StateWhereInput], {
    nullable: true
  })
  AND?: StateWhereInput[] | undefined;

  @TypeGraphQL.Field(_type => [StateWhereInput], {
    nullable: true
  })
  OR?: StateWhereInput[] | undefined;

  @TypeGraphQL.Field(_type => [StateWhereInput], {
    nullable: true
  })
  NOT?: StateWhereInput[] | undefined;

  @TypeGraphQL.Field(_type => DecimalFilter, {
    nullable: true
  })
  path?: DecimalFilter | undefined;

  @TypeGraphQL.Field(_type => DecimalNullableListFilter, {
    nullable: true
  })
  values?: DecimalNullableListFilter | undefined;

  @TypeGraphQL.Field(_type => StringFilter, {
    nullable: true
  })
  mask?: StringFilter | undefined;
}
