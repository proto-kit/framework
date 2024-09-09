import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { IncomingMessageBatchTransactionOrderByRelationAggregateInput } from "../inputs/IncomingMessageBatchTransactionOrderByRelationAggregateInput";
import { SortOrder } from "../../enums/SortOrder";

@TypeGraphQL.InputType("IncomingMessageBatchOrderByWithRelationInput", {})
export class IncomingMessageBatchOrderByWithRelationInput {
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

  @TypeGraphQL.Field(_type => IncomingMessageBatchTransactionOrderByRelationAggregateInput, {
    nullable: true
  })
  messages?: IncomingMessageBatchTransactionOrderByRelationAggregateInput | undefined;
}
