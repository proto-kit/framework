import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { IncomingMessageBatchOrderByWithRelationInput } from "../inputs/IncomingMessageBatchOrderByWithRelationInput";
import { TransactionOrderByWithRelationInput } from "../inputs/TransactionOrderByWithRelationInput";
import { SortOrder } from "../../enums/SortOrder";

@TypeGraphQL.InputType("IncomingMessageBatchTransactionOrderByWithRelationInput", {})
export class IncomingMessageBatchTransactionOrderByWithRelationInput {
  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  transactionHash?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  batchId?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => TransactionOrderByWithRelationInput, {
    nullable: true
  })
  transaction?: TransactionOrderByWithRelationInput | undefined;

  @TypeGraphQL.Field(_type => IncomingMessageBatchOrderByWithRelationInput, {
    nullable: true
  })
  batch?: IncomingMessageBatchOrderByWithRelationInput | undefined;
}
