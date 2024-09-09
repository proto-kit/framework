import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { SortOrderInput } from "../inputs/SortOrderInput";
import { TransactionExecutionResultCountOrderByAggregateInput } from "../inputs/TransactionExecutionResultCountOrderByAggregateInput";
import { TransactionExecutionResultMaxOrderByAggregateInput } from "../inputs/TransactionExecutionResultMaxOrderByAggregateInput";
import { TransactionExecutionResultMinOrderByAggregateInput } from "../inputs/TransactionExecutionResultMinOrderByAggregateInput";
import { SortOrder } from "../../enums/SortOrder";

@TypeGraphQL.InputType("TransactionExecutionResultOrderByWithAggregationInput", {})
export class TransactionExecutionResultOrderByWithAggregationInput {
  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  stateTransitions?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  protocolTransitions?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  status?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => SortOrderInput, {
    nullable: true
  })
  statusMessage?: SortOrderInput | undefined;

  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  txHash?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  blockHash?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => TransactionExecutionResultCountOrderByAggregateInput, {
    nullable: true
  })
  _count?: TransactionExecutionResultCountOrderByAggregateInput | undefined;

  @TypeGraphQL.Field(_type => TransactionExecutionResultMaxOrderByAggregateInput, {
    nullable: true
  })
  _max?: TransactionExecutionResultMaxOrderByAggregateInput | undefined;

  @TypeGraphQL.Field(_type => TransactionExecutionResultMinOrderByAggregateInput, {
    nullable: true
  })
  _min?: TransactionExecutionResultMinOrderByAggregateInput | undefined;
}
