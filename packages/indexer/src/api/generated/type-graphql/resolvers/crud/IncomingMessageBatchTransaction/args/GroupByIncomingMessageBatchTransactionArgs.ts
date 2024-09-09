import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { IncomingMessageBatchTransactionOrderByWithAggregationInput } from "../../../inputs/IncomingMessageBatchTransactionOrderByWithAggregationInput";
import { IncomingMessageBatchTransactionScalarWhereWithAggregatesInput } from "../../../inputs/IncomingMessageBatchTransactionScalarWhereWithAggregatesInput";
import { IncomingMessageBatchTransactionWhereInput } from "../../../inputs/IncomingMessageBatchTransactionWhereInput";
import { IncomingMessageBatchTransactionScalarFieldEnum } from "../../../../enums/IncomingMessageBatchTransactionScalarFieldEnum";

@TypeGraphQL.ArgsType()
export class GroupByIncomingMessageBatchTransactionArgs {
  @TypeGraphQL.Field(_type => IncomingMessageBatchTransactionWhereInput, {
    nullable: true
  })
  where?: IncomingMessageBatchTransactionWhereInput | undefined;

  @TypeGraphQL.Field(_type => [IncomingMessageBatchTransactionOrderByWithAggregationInput], {
    nullable: true
  })
  orderBy?: IncomingMessageBatchTransactionOrderByWithAggregationInput[] | undefined;

  @TypeGraphQL.Field(_type => [IncomingMessageBatchTransactionScalarFieldEnum], {
    nullable: false
  })
  by!: Array<"transactionHash" | "batchId">;

  @TypeGraphQL.Field(_type => IncomingMessageBatchTransactionScalarWhereWithAggregatesInput, {
    nullable: true
  })
  having?: IncomingMessageBatchTransactionScalarWhereWithAggregatesInput | undefined;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: true
  })
  take?: number | undefined;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: true
  })
  skip?: number | undefined;
}
