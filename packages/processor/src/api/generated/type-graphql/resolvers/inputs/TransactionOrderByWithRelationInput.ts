import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { IncomingMessageBatchTransactionOrderByRelationAggregateInput } from "../inputs/IncomingMessageBatchTransactionOrderByRelationAggregateInput";
import { TransactionExecutionResultOrderByWithRelationInput } from "../inputs/TransactionExecutionResultOrderByWithRelationInput";
import { SortOrder } from "../../enums/SortOrder";

@TypeGraphQL.InputType("TransactionOrderByWithRelationInput", {})
export class TransactionOrderByWithRelationInput {
  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  hash?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  methodId?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  sender?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  nonce?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  argsFields?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  auxiliaryData?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  signature_r?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  signature_s?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  isMessage?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => TransactionExecutionResultOrderByWithRelationInput, {
    nullable: true
  })
  executionResult?: TransactionExecutionResultOrderByWithRelationInput | undefined;

  @TypeGraphQL.Field(_type => IncomingMessageBatchTransactionOrderByRelationAggregateInput, {
    nullable: true
  })
  IncomingMessageBatchTransaction?: IncomingMessageBatchTransactionOrderByRelationAggregateInput | undefined;
}
