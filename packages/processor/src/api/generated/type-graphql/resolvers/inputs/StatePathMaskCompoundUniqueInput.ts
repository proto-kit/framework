import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";

@TypeGraphQL.InputType("StatePathMaskCompoundUniqueInput", {})
export class StatePathMaskCompoundUniqueInput {
  @TypeGraphQL.Field(_type => DecimalJSScalar, {
    nullable: false
  })
  path!: Prisma.Decimal;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  mask!: string;
}
