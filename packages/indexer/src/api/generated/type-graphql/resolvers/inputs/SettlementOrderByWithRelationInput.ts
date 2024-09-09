import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BatchOrderByRelationAggregateInput } from "../inputs/BatchOrderByRelationAggregateInput";
import { SortOrder } from "../../enums/SortOrder";

@TypeGraphQL.InputType("SettlementOrderByWithRelationInput", {})
export class SettlementOrderByWithRelationInput {
  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  transactionHash?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  promisedMessagesHash?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => BatchOrderByRelationAggregateInput, {
    nullable: true
  })
  batches?: BatchOrderByRelationAggregateInput | undefined;
}
