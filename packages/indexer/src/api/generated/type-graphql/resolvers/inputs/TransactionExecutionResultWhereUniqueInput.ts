import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BlockRelationFilter } from "../inputs/BlockRelationFilter";
import { BoolFilter } from "../inputs/BoolFilter";
import { JsonFilter } from "../inputs/JsonFilter";
import { StringFilter } from "../inputs/StringFilter";
import { StringNullableFilter } from "../inputs/StringNullableFilter";
import { TransactionExecutionResultWhereInput } from "../inputs/TransactionExecutionResultWhereInput";
import { TransactionRelationFilter } from "../inputs/TransactionRelationFilter";

@TypeGraphQL.InputType("TransactionExecutionResultWhereUniqueInput", {})
export class TransactionExecutionResultWhereUniqueInput {
  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  txHash?: string | undefined;

  @TypeGraphQL.Field(_type => [TransactionExecutionResultWhereInput], {
    nullable: true
  })
  AND?: TransactionExecutionResultWhereInput[] | undefined;

  @TypeGraphQL.Field(_type => [TransactionExecutionResultWhereInput], {
    nullable: true
  })
  OR?: TransactionExecutionResultWhereInput[] | undefined;

  @TypeGraphQL.Field(_type => [TransactionExecutionResultWhereInput], {
    nullable: true
  })
  NOT?: TransactionExecutionResultWhereInput[] | undefined;

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
  blockHash?: StringFilter | undefined;

  @TypeGraphQL.Field(_type => TransactionRelationFilter, {
    nullable: true
  })
  tx?: TransactionRelationFilter | undefined;

  @TypeGraphQL.Field(_type => BlockRelationFilter, {
    nullable: true
  })
  block?: BlockRelationFilter | undefined;
}
