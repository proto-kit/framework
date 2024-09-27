import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BatchNullableRelationFilter } from "../inputs/BatchNullableRelationFilter";
import { BlockNullableRelationFilter } from "../inputs/BlockNullableRelationFilter";
import { BlockResultNullableRelationFilter } from "../inputs/BlockResultNullableRelationFilter";
import { IntFilter } from "../inputs/IntFilter";
import { IntNullableFilter } from "../inputs/IntNullableFilter";
import { JsonFilter } from "../inputs/JsonFilter";
import { StringFilter } from "../inputs/StringFilter";
import { StringNullableFilter } from "../inputs/StringNullableFilter";
import { TransactionExecutionResultListRelationFilter } from "../inputs/TransactionExecutionResultListRelationFilter";

@TypeGraphQL.InputType("BlockWhereInput", {})
export class BlockWhereInput {
  @TypeGraphQL.Field(_type => [BlockWhereInput], {
    nullable: true
  })
  AND?: BlockWhereInput[] | undefined;

  @TypeGraphQL.Field(_type => [BlockWhereInput], {
    nullable: true
  })
  OR?: BlockWhereInput[] | undefined;

  @TypeGraphQL.Field(_type => [BlockWhereInput], {
    nullable: true
  })
  NOT?: BlockWhereInput[] | undefined;

  @TypeGraphQL.Field(_type => StringFilter, {
    nullable: true
  })
  hash?: StringFilter | undefined;

  @TypeGraphQL.Field(_type => StringFilter, {
    nullable: true
  })
  transactionsHash?: StringFilter | undefined;

  @TypeGraphQL.Field(_type => JsonFilter, {
    nullable: true
  })
  beforeNetworkState?: JsonFilter | undefined;

  @TypeGraphQL.Field(_type => JsonFilter, {
    nullable: true
  })
  duringNetworkState?: JsonFilter | undefined;

  @TypeGraphQL.Field(_type => IntFilter, {
    nullable: true
  })
  height?: IntFilter | undefined;

  @TypeGraphQL.Field(_type => StringFilter, {
    nullable: true
  })
  fromEternalTransactionsHash?: StringFilter | undefined;

  @TypeGraphQL.Field(_type => StringFilter, {
    nullable: true
  })
  toEternalTransactionsHash?: StringFilter | undefined;

  @TypeGraphQL.Field(_type => StringFilter, {
    nullable: true
  })
  fromBlockHashRoot?: StringFilter | undefined;

  @TypeGraphQL.Field(_type => StringFilter, {
    nullable: true
  })
  fromMessagesHash?: StringFilter | undefined;

  @TypeGraphQL.Field(_type => StringFilter, {
    nullable: true
  })
  toMessagesHash?: StringFilter | undefined;

  @TypeGraphQL.Field(_type => StringNullableFilter, {
    nullable: true
  })
  parentHash?: StringNullableFilter | undefined;

  @TypeGraphQL.Field(_type => IntNullableFilter, {
    nullable: true
  })
  batchHeight?: IntNullableFilter | undefined;

  @TypeGraphQL.Field(_type => BlockNullableRelationFilter, {
    nullable: true
  })
  parent?: BlockNullableRelationFilter | undefined;

  @TypeGraphQL.Field(_type => BlockNullableRelationFilter, {
    nullable: true
  })
  successor?: BlockNullableRelationFilter | undefined;

  @TypeGraphQL.Field(_type => TransactionExecutionResultListRelationFilter, {
    nullable: true
  })
  transactions?: TransactionExecutionResultListRelationFilter | undefined;

  @TypeGraphQL.Field(_type => BlockResultNullableRelationFilter, {
    nullable: true
  })
  result?: BlockResultNullableRelationFilter | undefined;

  @TypeGraphQL.Field(_type => BatchNullableRelationFilter, {
    nullable: true
  })
  batch?: BatchNullableRelationFilter | undefined;
}
