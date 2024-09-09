import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { NestedDecimalFilter } from "../inputs/NestedDecimalFilter";

@TypeGraphQL.InputType("DecimalFilter", {})
export class DecimalFilter {
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

  @TypeGraphQL.Field(_type => NestedDecimalFilter, {
    nullable: true
  })
  not?: NestedDecimalFilter | undefined;
}
