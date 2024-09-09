import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { IncomingMessageBatchOrderByWithAggregationInput } from "../../../inputs/IncomingMessageBatchOrderByWithAggregationInput";
import { IncomingMessageBatchScalarWhereWithAggregatesInput } from "../../../inputs/IncomingMessageBatchScalarWhereWithAggregatesInput";
import { IncomingMessageBatchWhereInput } from "../../../inputs/IncomingMessageBatchWhereInput";
import { IncomingMessageBatchScalarFieldEnum } from "../../../../enums/IncomingMessageBatchScalarFieldEnum";

@TypeGraphQL.ArgsType()
export class GroupByIncomingMessageBatchArgs {
  @TypeGraphQL.Field(_type => IncomingMessageBatchWhereInput, {
    nullable: true
  })
  where?: IncomingMessageBatchWhereInput | undefined;

  @TypeGraphQL.Field(_type => [IncomingMessageBatchOrderByWithAggregationInput], {
    nullable: true
  })
  orderBy?: IncomingMessageBatchOrderByWithAggregationInput[] | undefined;

  @TypeGraphQL.Field(_type => [IncomingMessageBatchScalarFieldEnum], {
    nullable: false
  })
  by!: Array<"id" | "fromMessageHash" | "toMessageHash">;

  @TypeGraphQL.Field(_type => IncomingMessageBatchScalarWhereWithAggregatesInput, {
    nullable: true
  })
  having?: IncomingMessageBatchScalarWhereWithAggregatesInput | undefined;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: true
  })
  take?: number | undefined;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: true
  })
  skip?: number | undefined;
}
