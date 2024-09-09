import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { SettlementCountOrderByAggregateInput } from "../inputs/SettlementCountOrderByAggregateInput";
import { SettlementMaxOrderByAggregateInput } from "../inputs/SettlementMaxOrderByAggregateInput";
import { SettlementMinOrderByAggregateInput } from "../inputs/SettlementMinOrderByAggregateInput";
import { SortOrder } from "../../enums/SortOrder";

@TypeGraphQL.InputType("SettlementOrderByWithAggregationInput", {})
export class SettlementOrderByWithAggregationInput {
  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  transactionHash?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  promisedMessagesHash?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => SettlementCountOrderByAggregateInput, {
    nullable: true
  })
  _count?: SettlementCountOrderByAggregateInput | undefined;

  @TypeGraphQL.Field(_type => SettlementMaxOrderByAggregateInput, {
    nullable: true
  })
  _max?: SettlementMaxOrderByAggregateInput | undefined;

  @TypeGraphQL.Field(_type => SettlementMinOrderByAggregateInput, {
    nullable: true
  })
  _min?: SettlementMinOrderByAggregateInput | undefined;
}
