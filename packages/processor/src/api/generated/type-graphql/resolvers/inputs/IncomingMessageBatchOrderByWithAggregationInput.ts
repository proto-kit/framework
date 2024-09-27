import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { IncomingMessageBatchAvgOrderByAggregateInput } from "../inputs/IncomingMessageBatchAvgOrderByAggregateInput";
import { IncomingMessageBatchCountOrderByAggregateInput } from "../inputs/IncomingMessageBatchCountOrderByAggregateInput";
import { IncomingMessageBatchMaxOrderByAggregateInput } from "../inputs/IncomingMessageBatchMaxOrderByAggregateInput";
import { IncomingMessageBatchMinOrderByAggregateInput } from "../inputs/IncomingMessageBatchMinOrderByAggregateInput";
import { IncomingMessageBatchSumOrderByAggregateInput } from "../inputs/IncomingMessageBatchSumOrderByAggregateInput";
import { SortOrder } from "../../enums/SortOrder";

@TypeGraphQL.InputType("IncomingMessageBatchOrderByWithAggregationInput", {})
export class IncomingMessageBatchOrderByWithAggregationInput {
  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  id?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  fromMessageHash?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  toMessageHash?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => IncomingMessageBatchCountOrderByAggregateInput, {
    nullable: true
  })
  _count?: IncomingMessageBatchCountOrderByAggregateInput | undefined;

  @TypeGraphQL.Field(_type => IncomingMessageBatchAvgOrderByAggregateInput, {
    nullable: true
  })
  _avg?: IncomingMessageBatchAvgOrderByAggregateInput | undefined;

  @TypeGraphQL.Field(_type => IncomingMessageBatchMaxOrderByAggregateInput, {
    nullable: true
  })
  _max?: IncomingMessageBatchMaxOrderByAggregateInput | undefined;

  @TypeGraphQL.Field(_type => IncomingMessageBatchMinOrderByAggregateInput, {
    nullable: true
  })
  _min?: IncomingMessageBatchMinOrderByAggregateInput | undefined;

  @TypeGraphQL.Field(_type => IncomingMessageBatchSumOrderByAggregateInput, {
    nullable: true
  })
  _sum?: IncomingMessageBatchSumOrderByAggregateInput | undefined;
}
