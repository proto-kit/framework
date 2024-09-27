import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { TransactionCreateWithoutIncomingMessageBatchTransactionInput } from "../inputs/TransactionCreateWithoutIncomingMessageBatchTransactionInput";
import { TransactionWhereUniqueInput } from "../inputs/TransactionWhereUniqueInput";

@TypeGraphQL.InputType("TransactionCreateOrConnectWithoutIncomingMessageBatchTransactionInput", {})
export class TransactionCreateOrConnectWithoutIncomingMessageBatchTransactionInput {
  @TypeGraphQL.Field(_type => TransactionWhereUniqueInput, {
    nullable: false
  })
  where!: TransactionWhereUniqueInput;

  @TypeGraphQL.Field(_type => TransactionCreateWithoutIncomingMessageBatchTransactionInput, {
    nullable: false
  })
  create!: TransactionCreateWithoutIncomingMessageBatchTransactionInput;
}
