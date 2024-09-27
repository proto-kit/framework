import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { NestedDecimalFilter } from "../inputs/NestedDecimalFilter";
import { NestedIntFilter } from "../inputs/NestedIntFilter";

@TypeGraphQL.InputType("NestedDecimalWithAggregatesFilter", {})
export class NestedDecimalWithAggregatesFilter {
  @TypeGraphQL.Field(_type => DecimalJSScalar, {
    nullable: true
  })
  equals?: Prisma.Decimal | undefined;

  @TypeGraphQL.Field(_type => [DecimalJSScalar], {
    nullable: true
  })
  in?: Prisma.Decimal[] | undefined;

  @TypeGraphQL.Field(_type => [DecimalJSScalar], {
    nullable: true
  })
  notIn?: Prisma.Decimal[] | undefined;

  @TypeGraphQL.Field(_type => DecimalJSScalar, {
    nullable: true
  })
  lt?: Prisma.Decimal | undefined;

  @TypeGraphQL.Field(_type => DecimalJSScalar, {
    nullable: true
  })
  lte?: Prisma.Decimal | undefined;

  @TypeGraphQL.Field(_type => DecimalJSScalar, {
    nullable: true
  })
  gt?: Prisma.Decimal | undefined;

  @TypeGraphQL.Field(_type => DecimalJSScalar, {
    nullable: true
  })
  gte?: Prisma.Decimal | undefined;

  @TypeGraphQL.Field(_type => NestedDecimalWithAggregatesFilter, {
    nullable: true
  })
  not?: NestedDecimalWithAggregatesFilter | undefined;

  @TypeGraphQL.Field(_type => NestedIntFilter, {
    nullable: true
  })
  _count?: NestedIntFilter | undefined;

  @TypeGraphQL.Field(_type => NestedDecimalFilter, {
    nullable: true
  })
  _avg?: NestedDecimalFilter | undefined;

  @TypeGraphQL.Field(_type => NestedDecimalFilter, {
    nullable: true
  })
  _sum?: NestedDecimalFilter | undefined;

  @TypeGraphQL.Field(_type => NestedDecimalFilter, {
    nullable: true
  })
  _min?: NestedDecimalFilter | undefined;

  @TypeGraphQL.Field(_type => NestedDecimalFilter, {
    nullable: true
  })
  _max?: NestedDecimalFilter | undefined;
}
