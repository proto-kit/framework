import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { BatchOrderByWithAggregationInput } from "../../../inputs/BatchOrderByWithAggregationInput";
import { BatchScalarWhereWithAggregatesInput } from "../../../inputs/BatchScalarWhereWithAggregatesInput";
import { BatchWhereInput } from "../../../inputs/BatchWhereInput";
import { BatchScalarFieldEnum } from "../../../../enums/BatchScalarFieldEnum";

@TypeGraphQL.ArgsType()
export class GroupByBatchArgs {
  @TypeGraphQL.Field(_type => BatchWhereInput, {
    nullable: true
  })
  where?: BatchWhereInput | undefined;

  @TypeGraphQL.Field(_type => [BatchOrderByWithAggregationInput], {
    nullable: true
  })
  orderBy?: BatchOrderByWithAggregationInput[] | undefined;

  @TypeGraphQL.Field(_type => [BatchScalarFieldEnum], {
    nullable: false
  })
  by!: Array<"height" | "proof" | "settlementTransactionHash">;

  @TypeGraphQL.Field(_type => BatchScalarWhereWithAggregatesInput, {
    nullable: true
  })
  having?: BatchScalarWhereWithAggregatesInput | undefined;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: true
  })
  take?: number | undefined;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: true
  })
  skip?: number | undefined;
}
