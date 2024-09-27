import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BoolFilter } from "../inputs/BoolFilter";
import { JsonFilter } from "../inputs/JsonFilter";
import { StringFilter } from "../inputs/StringFilter";
import { StringNullableFilter } from "../inputs/StringNullableFilter";

@TypeGraphQL.InputType("TransactionExecutionResultScalarWhereInput", {})
export class TransactionExecutionResultScalarWhereInput {
  @TypeGraphQL.Field(_type => [TransactionExecutionResultScalarWhereInput], {
    nullable: true
  })
  AND?: TransactionExecutionResultScalarWhereInput[] | undefined;

  @TypeGraphQL.Field(_type => [TransactionExecutionResultScalarWhereInput], {
    nullable: true
  })
  OR?: TransactionExecutionResultScalarWhereInput[] | undefined;

  @TypeGraphQL.Field(_type => [TransactionExecutionResultScalarWhereInput], {
    nullable: true
  })
  NOT?: TransactionExecutionResultScalarWhereInput[] | undefined;

  @TypeGraphQL.Field(_type => JsonFilter, {
    nullable: true
  })
  stateTransitions?: JsonFilter | undefined;

  @TypeGraphQL.Field(_type => JsonFilter, {
    nullable: true
  })
  protocolTransitions?: JsonFilter | undefined;

  @TypeGraphQL.Field(_type => BoolFilter, {
    nullable: true
  })
  status?: BoolFilter | undefined;

  @TypeGraphQL.Field(_type => StringNullableFilter, {
    nullable: true
  })
  statusMessage?: StringNullableFilter | undefined;

  @TypeGraphQL.Field(_type => StringFilter, {
    nullable: true
  })
  txHash?: StringFilter | undefined;

  @TypeGraphQL.Field(_type => StringFilter, {
    nullable: true
  })
  blockHash?: StringFilter | undefined;
}
