import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { IncomingMessageBatchTransactionAvgOrderByAggregateInput } from "../inputs/IncomingMessageBatchTransactionAvgOrderByAggregateInput";
import { IncomingMessageBatchTransactionCountOrderByAggregateInput } from "../inputs/IncomingMessageBatchTransactionCountOrderByAggregateInput";
import { IncomingMessageBatchTransactionMaxOrderByAggregateInput } from "../inputs/IncomingMessageBatchTransactionMaxOrderByAggregateInput";
import { IncomingMessageBatchTransactionMinOrderByAggregateInput } from "../inputs/IncomingMessageBatchTransactionMinOrderByAggregateInput";
import { IncomingMessageBatchTransactionSumOrderByAggregateInput } from "../inputs/IncomingMessageBatchTransactionSumOrderByAggregateInput";
import { SortOrder } from "../../enums/SortOrder";

@TypeGraphQL.InputType("IncomingMessageBatchTransactionOrderByWithAggregationInput", {})
export class IncomingMessageBatchTransactionOrderByWithAggregationInput {
  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  transactionHash?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  batchId?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => IncomingMessageBatchTransactionCountOrderByAggregateInput, {
    nullable: true
  })
  _count?: IncomingMessageBatchTransactionCountOrderByAggregateInput | undefined;

  @TypeGraphQL.Field(_type => IncomingMessageBatchTransactionAvgOrderByAggregateInput, {
    nullable: true
  })
  _avg?: IncomingMessageBatchTransactionAvgOrderByAggregateInput | undefined;

  @TypeGraphQL.Field(_type => IncomingMessageBatchTransactionMaxOrderByAggregateInput, {
    nullable: true
  })
  _max?: IncomingMessageBatchTransactionMaxOrderByAggregateInput | undefined;

  @TypeGraphQL.Field(_type => IncomingMessageBatchTransactionMinOrderByAggregateInput, {
    nullable: true
  })
  _min?: IncomingMessageBatchTransactionMinOrderByAggregateInput | undefined;

  @TypeGraphQL.Field(_type => IncomingMessageBatchTransactionSumOrderByAggregateInput, {
    nullable: true
  })
  _sum?: IncomingMessageBatchTransactionSumOrderByAggregateInput | undefined;
}
