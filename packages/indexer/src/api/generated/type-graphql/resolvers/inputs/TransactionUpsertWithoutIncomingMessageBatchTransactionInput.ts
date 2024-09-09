import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { TransactionCreateWithoutIncomingMessageBatchTransactionInput } from "../inputs/TransactionCreateWithoutIncomingMessageBatchTransactionInput";
import { TransactionUpdateWithoutIncomingMessageBatchTransactionInput } from "../inputs/TransactionUpdateWithoutIncomingMessageBatchTransactionInput";
import { TransactionWhereInput } from "../inputs/TransactionWhereInput";

@TypeGraphQL.InputType("TransactionUpsertWithoutIncomingMessageBatchTransactionInput", {})
export class TransactionUpsertWithoutIncomingMessageBatchTransactionInput {
  @TypeGraphQL.Field(_type => TransactionUpdateWithoutIncomingMessageBatchTransactionInput, {
    nullable: false
  })
  update!: TransactionUpdateWithoutIncomingMessageBatchTransactionInput;

  @TypeGraphQL.Field(_type => TransactionCreateWithoutIncomingMessageBatchTransactionInput, {
    nullable: false
  })
  create!: TransactionCreateWithoutIncomingMessageBatchTransactionInput;

  @TypeGraphQL.Field(_type => TransactionWhereInput, {
    nullable: true
  })
  where?: TransactionWhereInput | undefined;
}
