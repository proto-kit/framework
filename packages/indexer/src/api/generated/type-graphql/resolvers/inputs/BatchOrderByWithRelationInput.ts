import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BlockOrderByRelationAggregateInput } from "../inputs/BlockOrderByRelationAggregateInput";
import { SettlementOrderByWithRelationInput } from "../inputs/SettlementOrderByWithRelationInput";
import { SortOrderInput } from "../inputs/SortOrderInput";
import { SortOrder } from "../../enums/SortOrder";

@TypeGraphQL.InputType("BatchOrderByWithRelationInput", {})
export class BatchOrderByWithRelationInput {
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

  @TypeGraphQL.Field(_type => BlockOrderByRelationAggregateInput, {
    nullable: true
  })
  blocks?: BlockOrderByRelationAggregateInput | undefined;

  @TypeGraphQL.Field(_type => SettlementOrderByWithRelationInput, {
    nullable: true
  })
  settlement?: SettlementOrderByWithRelationInput | undefined;
}
