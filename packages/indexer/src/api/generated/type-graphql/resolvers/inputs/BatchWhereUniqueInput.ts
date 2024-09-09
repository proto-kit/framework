import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BatchWhereInput } from "../inputs/BatchWhereInput";
import { BlockListRelationFilter } from "../inputs/BlockListRelationFilter";
import { JsonFilter } from "../inputs/JsonFilter";
import { SettlementNullableRelationFilter } from "../inputs/SettlementNullableRelationFilter";
import { StringNullableFilter } from "../inputs/StringNullableFilter";

@TypeGraphQL.InputType("BatchWhereUniqueInput", {})
export class BatchWhereUniqueInput {
  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: true
  })
  height?: number | undefined;

  @TypeGraphQL.Field(_type => [BatchWhereInput], {
    nullable: true
  })
  AND?: BatchWhereInput[] | undefined;

  @TypeGraphQL.Field(_type => [BatchWhereInput], {
    nullable: true
  })
  OR?: BatchWhereInput[] | undefined;

  @TypeGraphQL.Field(_type => [BatchWhereInput], {
    nullable: true
  })
  NOT?: BatchWhereInput[] | undefined;

  @TypeGraphQL.Field(_type => JsonFilter, {
    nullable: true
  })
  proof?: JsonFilter | undefined;

  @TypeGraphQL.Field(_type => StringNullableFilter, {
    nullable: true
  })
  settlementTransactionHash?: StringNullableFilter | undefined;

  @TypeGraphQL.Field(_type => BlockListRelationFilter, {
    nullable: true
  })
  blocks?: BlockListRelationFilter | undefined;

  @TypeGraphQL.Field(_type => SettlementNullableRelationFilter, {
    nullable: true
  })
  settlement?: SettlementNullableRelationFilter | undefined;
}
