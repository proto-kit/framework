import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { SettlementOrderByWithAggregationInput } from "../../../inputs/SettlementOrderByWithAggregationInput";
import { SettlementScalarWhereWithAggregatesInput } from "../../../inputs/SettlementScalarWhereWithAggregatesInput";
import { SettlementWhereInput } from "../../../inputs/SettlementWhereInput";
import { SettlementScalarFieldEnum } from "../../../../enums/SettlementScalarFieldEnum";

@TypeGraphQL.ArgsType()
export class GroupBySettlementArgs {
  @TypeGraphQL.Field(_type => SettlementWhereInput, {
    nullable: true
  })
  where?: SettlementWhereInput | undefined;

  @TypeGraphQL.Field(_type => [SettlementOrderByWithAggregationInput], {
    nullable: true
  })
  orderBy?: SettlementOrderByWithAggregationInput[] | undefined;

  @TypeGraphQL.Field(_type => [SettlementScalarFieldEnum], {
    nullable: false
  })
  by!: Array<"transactionHash" | "promisedMessagesHash">;

  @TypeGraphQL.Field(_type => SettlementScalarWhereWithAggregatesInput, {
    nullable: true
  })
  having?: SettlementScalarWhereWithAggregatesInput | undefined;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: true
  })
  take?: number | undefined;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: true
  })
  skip?: number | undefined;
}
