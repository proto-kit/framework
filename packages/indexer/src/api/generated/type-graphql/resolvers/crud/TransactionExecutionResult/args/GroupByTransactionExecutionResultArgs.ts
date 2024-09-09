import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { TransactionExecutionResultOrderByWithAggregationInput } from "../../../inputs/TransactionExecutionResultOrderByWithAggregationInput";
import { TransactionExecutionResultScalarWhereWithAggregatesInput } from "../../../inputs/TransactionExecutionResultScalarWhereWithAggregatesInput";
import { TransactionExecutionResultWhereInput } from "../../../inputs/TransactionExecutionResultWhereInput";
import { TransactionExecutionResultScalarFieldEnum } from "../../../../enums/TransactionExecutionResultScalarFieldEnum";

@TypeGraphQL.ArgsType()
export class GroupByTransactionExecutionResultArgs {
  @TypeGraphQL.Field(_type => TransactionExecutionResultWhereInput, {
    nullable: true
  })
  where?: TransactionExecutionResultWhereInput | undefined;

  @TypeGraphQL.Field(_type => [TransactionExecutionResultOrderByWithAggregationInput], {
    nullable: true
  })
  orderBy?: TransactionExecutionResultOrderByWithAggregationInput[] | undefined;

  @TypeGraphQL.Field(_type => [TransactionExecutionResultScalarFieldEnum], {
    nullable: false
  })
  by!: Array<"stateTransitions" | "protocolTransitions" | "status" | "statusMessage" | "txHash" | "blockHash">;

  @TypeGraphQL.Field(_type => TransactionExecutionResultScalarWhereWithAggregatesInput, {
    nullable: true
  })
  having?: TransactionExecutionResultScalarWhereWithAggregatesInput | undefined;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: true
  })
  take?: number | undefined;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: true
  })
  skip?: number | undefined;
}
