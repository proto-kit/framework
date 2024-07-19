import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "@prisma/client";
import { DecimalJSScalar } from "../../scalars";
import { BalanceWhereInput } from "../inputs/BalanceWhereInput";
import { StringFilter } from "../inputs/StringFilter";

@TypeGraphQL.InputType("BalanceWhereUniqueInput", {})
export class BalanceWhereUniqueInput {
  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: true
  })
  height?: number | undefined;

  @TypeGraphQL.Field(_type => [BalanceWhereInput], {
    nullable: true
  })
  AND?: BalanceWhereInput[] | undefined;

  @TypeGraphQL.Field(_type => [BalanceWhereInput], {
    nullable: true
  })
  OR?: BalanceWhereInput[] | undefined;

  @TypeGraphQL.Field(_type => [BalanceWhereInput], {
    nullable: true
  })
  NOT?: BalanceWhereInput[] | undefined;

  @TypeGraphQL.Field(_type => StringFilter, {
    nullable: true
  })
  address?: StringFilter | undefined;

  @TypeGraphQL.Field(_type => StringFilter, {
    nullable: true
  })
  balance?: StringFilter | undefined;
}
