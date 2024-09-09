import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BoolFilter } from "../inputs/BoolFilter";
import { IncomingMessageBatchTransactionListRelationFilter } from "../inputs/IncomingMessageBatchTransactionListRelationFilter";
import { StringFilter } from "../inputs/StringFilter";
import { StringNullableListFilter } from "../inputs/StringNullableListFilter";
import { TransactionExecutionResultNullableRelationFilter } from "../inputs/TransactionExecutionResultNullableRelationFilter";
import { TransactionWhereInput } from "../inputs/TransactionWhereInput";

@TypeGraphQL.InputType("TransactionWhereUniqueInput", {})
export class TransactionWhereUniqueInput {
  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  hash?: string | undefined;

  @TypeGraphQL.Field(_type => [TransactionWhereInput], {
    nullable: true
  })
  AND?: TransactionWhereInput[] | undefined;

  @TypeGraphQL.Field(_type => [TransactionWhereInput], {
    nullable: true
  })
  OR?: TransactionWhereInput[] | undefined;

  @TypeGraphQL.Field(_type => [TransactionWhereInput], {
    nullable: true
  })
  NOT?: TransactionWhereInput[] | undefined;

  @TypeGraphQL.Field(_type => StringFilter, {
    nullable: true
  })
  methodId?: StringFilter | undefined;

  @TypeGraphQL.Field(_type => StringFilter, {
    nullable: true
  })
  sender?: StringFilter | undefined;

  @TypeGraphQL.Field(_type => StringFilter, {
    nullable: true
  })
  nonce?: StringFilter | undefined;

  @TypeGraphQL.Field(_type => StringNullableListFilter, {
    nullable: true
  })
  argsFields?: StringNullableListFilter | undefined;

  @TypeGraphQL.Field(_type => StringNullableListFilter, {
    nullable: true
  })
  auxiliaryData?: StringNullableListFilter | undefined;

  @TypeGraphQL.Field(_type => StringFilter, {
    nullable: true
  })
  signature_r?: StringFilter | undefined;

  @TypeGraphQL.Field(_type => StringFilter, {
    nullable: true
  })
  signature_s?: StringFilter | undefined;

  @TypeGraphQL.Field(_type => BoolFilter, {
    nullable: true
  })
  isMessage?: BoolFilter | undefined;

  @TypeGraphQL.Field(_type => TransactionExecutionResultNullableRelationFilter, {
    nullable: true
  })
  executionResult?: TransactionExecutionResultNullableRelationFilter | undefined;

  @TypeGraphQL.Field(_type => IncomingMessageBatchTransactionListRelationFilter, {
    nullable: true
  })
  IncomingMessageBatchTransaction?: IncomingMessageBatchTransactionListRelationFilter | undefined;
}
