import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { SettlementWhereInput } from "../inputs/SettlementWhereInput";

@TypeGraphQL.InputType("SettlementNullableRelationFilter", {})
export class SettlementNullableRelationFilter {
  @TypeGraphQL.Field(_type => SettlementWhereInput, {
    nullable: true
  })
  is?: SettlementWhereInput | undefined;

  @TypeGraphQL.Field(_type => SettlementWhereInput, {
    nullable: true
  })
  isNot?: SettlementWhereInput | undefined;
}
