import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BlockResultCountOrderByAggregateInput } from "../inputs/BlockResultCountOrderByAggregateInput";
import { BlockResultMaxOrderByAggregateInput } from "../inputs/BlockResultMaxOrderByAggregateInput";
import { BlockResultMinOrderByAggregateInput } from "../inputs/BlockResultMinOrderByAggregateInput";
import { SortOrder } from "../../enums/SortOrder";

@TypeGraphQL.InputType("BlockResultOrderByWithAggregationInput", {})
export class BlockResultOrderByWithAggregationInput {
  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  blockHash?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  stateRoot?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  blockHashRoot?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  afterNetworkState?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  blockStateTransitions?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  blockHashWitness?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => BlockResultCountOrderByAggregateInput, {
    nullable: true
  })
  _count?: BlockResultCountOrderByAggregateInput | undefined;

  @TypeGraphQL.Field(_type => BlockResultMaxOrderByAggregateInput, {
    nullable: true
  })
  _max?: BlockResultMaxOrderByAggregateInput | undefined;

  @TypeGraphQL.Field(_type => BlockResultMinOrderByAggregateInput, {
    nullable: true
  })
  _min?: BlockResultMinOrderByAggregateInput | undefined;
}
