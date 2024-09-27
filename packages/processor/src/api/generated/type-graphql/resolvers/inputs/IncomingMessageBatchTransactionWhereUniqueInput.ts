import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { IncomingMessageBatchRelationFilter } from "../inputs/IncomingMessageBatchRelationFilter";
import { IncomingMessageBatchTransactionTransactionHashBatchIdCompoundUniqueInput } from "../inputs/IncomingMessageBatchTransactionTransactionHashBatchIdCompoundUniqueInput";
import { IncomingMessageBatchTransactionWhereInput } from "../inputs/IncomingMessageBatchTransactionWhereInput";
import { IntFilter } from "../inputs/IntFilter";
import { StringFilter } from "../inputs/StringFilter";
import { TransactionRelationFilter } from "../inputs/TransactionRelationFilter";

@TypeGraphQL.InputType("IncomingMessageBatchTransactionWhereUniqueInput", {})
export class IncomingMessageBatchTransactionWhereUniqueInput {
  @TypeGraphQL.Field(_type => IncomingMessageBatchTransactionTransactionHashBatchIdCompoundUniqueInput, {
    nullable: true
  })
  transactionHash_batchId?: IncomingMessageBatchTransactionTransactionHashBatchIdCompoundUniqueInput | undefined;

  @TypeGraphQL.Field(_type => [IncomingMessageBatchTransactionWhereInput], {
    nullable: true
  })
  AND?: IncomingMessageBatchTransactionWhereInput[] | undefined;

  @TypeGraphQL.Field(_type => [IncomingMessageBatchTransactionWhereInput], {
    nullable: true
  })
  OR?: IncomingMessageBatchTransactionWhereInput[] | undefined;

  @TypeGraphQL.Field(_type => [IncomingMessageBatchTransactionWhereInput], {
    nullable: true
  })
  NOT?: IncomingMessageBatchTransactionWhereInput[] | undefined;

  @TypeGraphQL.Field(_type => StringFilter, {
    nullable: true
  })
  transactionHash?: StringFilter | undefined;

  @TypeGraphQL.Field(_type => IntFilter, {
    nullable: true
  })
  batchId?: IntFilter | undefined;

  @TypeGraphQL.Field(_type => TransactionRelationFilter, {
    nullable: true
  })
  transaction?: TransactionRelationFilter | undefined;

  @TypeGraphQL.Field(_type => IncomingMessageBatchRelationFilter, {
    nullable: true
  })
  batch?: IncomingMessageBatchRelationFilter | undefined;
}
