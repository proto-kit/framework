import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BatchOrderByWithRelationInput } from "../inputs/BatchOrderByWithRelationInput";
import { BlockResultOrderByWithRelationInput } from "../inputs/BlockResultOrderByWithRelationInput";
import { SortOrderInput } from "../inputs/SortOrderInput";
import { TransactionExecutionResultOrderByRelationAggregateInput } from "../inputs/TransactionExecutionResultOrderByRelationAggregateInput";
import { SortOrder } from "../../enums/SortOrder";

@TypeGraphQL.InputType("BlockOrderByWithRelationInput", {})
export class BlockOrderByWithRelationInput {
  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  hash?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  transactionsHash?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  beforeNetworkState?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  duringNetworkState?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  height?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  fromEternalTransactionsHash?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  toEternalTransactionsHash?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  fromBlockHashRoot?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  fromMessagesHash?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  toMessagesHash?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => SortOrderInput, {
    nullable: true
  })
  parentHash?: SortOrderInput | undefined;

  @TypeGraphQL.Field(_type => SortOrderInput, {
    nullable: true
  })
  batchHeight?: SortOrderInput | undefined;

  @TypeGraphQL.Field(_type => BlockOrderByWithRelationInput, {
    nullable: true
  })
  parent?: BlockOrderByWithRelationInput | undefined;

  @TypeGraphQL.Field(_type => BlockOrderByWithRelationInput, {
    nullable: true
  })
  successor?: BlockOrderByWithRelationInput | undefined;

  @TypeGraphQL.Field(_type => TransactionExecutionResultOrderByRelationAggregateInput, {
    nullable: true
  })
  transactions?: TransactionExecutionResultOrderByRelationAggregateInput | undefined;

  @TypeGraphQL.Field(_type => BlockResultOrderByWithRelationInput, {
    nullable: true
  })
  result?: BlockResultOrderByWithRelationInput | undefined;

  @TypeGraphQL.Field(_type => BatchOrderByWithRelationInput, {
    nullable: true
  })
  batch?: BatchOrderByWithRelationInput | undefined;
}
