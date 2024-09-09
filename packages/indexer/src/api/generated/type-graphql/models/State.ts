import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../scalars";

@TypeGraphQL.ObjectType("State", {})
export class State {
  @TypeGraphQL.Field(_type => DecimalJSScalar, {
    nullable: false
  })
  path!: Prisma.Decimal;

  @TypeGraphQL.Field(_type => [DecimalJSScalar], {
    nullable: false
  })
  values!: Prisma.Decimal[];

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  mask!: string;
}
