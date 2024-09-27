import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BatchAvgOrderByAggregateInput } from "../inputs/BatchAvgOrderByAggregateInput";
import { BatchCountOrderByAggregateInput } from "../inputs/BatchCountOrderByAggregateInput";
import { BatchMaxOrderByAggregateInput } from "../inputs/BatchMaxOrderByAggregateInput";
import { BatchMinOrderByAggregateInput } from "../inputs/BatchMinOrderByAggregateInput";
import { BatchSumOrderByAggregateInput } from "../inputs/BatchSumOrderByAggregateInput";
import { SortOrderInput } from "../inputs/SortOrderInput";
import { SortOrder } from "../../enums/SortOrder";

@TypeGraphQL.InputType("BatchOrderByWithAggregationInput", {})
export class BatchOrderByWithAggregationInput {
  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  height?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  proof?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => SortOrderInput, {
    nullable: true
  })
  settlementTransactionHash?: SortOrderInput | undefined;

  @TypeGraphQL.Field(_type => BatchCountOrderByAggregateInput, {
    nullable: true
  })
  _count?: BatchCountOrderByAggregateInput | undefined;

  @TypeGraphQL.Field(_type => BatchAvgOrderByAggregateInput, {
    nullable: true
  })
  _avg?: BatchAvgOrderByAggregateInput | undefined;

  @TypeGraphQL.Field(_type => BatchMaxOrderByAggregateInput, {
    nullable: true
  })
  _max?: BatchMaxOrderByAggregateInput | undefined;

  @TypeGraphQL.Field(_type => BatchMinOrderByAggregateInput, {
    nullable: true
  })
  _min?: BatchMinOrderByAggregateInput | undefined;

  @TypeGraphQL.Field(_type => BatchSumOrderByAggregateInput, {
    nullable: true
  })
  _sum?: BatchSumOrderByAggregateInput | undefined;
}
