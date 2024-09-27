import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { TransactionCreateOrConnectWithoutIncomingMessageBatchTransactionInput } from "../inputs/TransactionCreateOrConnectWithoutIncomingMessageBatchTransactionInput";
import { TransactionCreateWithoutIncomingMessageBatchTransactionInput } from "../inputs/TransactionCreateWithoutIncomingMessageBatchTransactionInput";
import { TransactionWhereUniqueInput } from "../inputs/TransactionWhereUniqueInput";

@TypeGraphQL.InputType("TransactionCreateNestedOneWithoutIncomingMessageBatchTransactionInput", {})
export class TransactionCreateNestedOneWithoutIncomingMessageBatchTransactionInput {
  @TypeGraphQL.Field(_type => TransactionCreateWithoutIncomingMessageBatchTransactionInput, {
    nullable: true
  })
  create?: TransactionCreateWithoutIncomingMessageBatchTransactionInput | undefined;

  @TypeGraphQL.Field(_type => TransactionCreateOrConnectWithoutIncomingMessageBatchTransactionInput, {
    nullable: true
  })
  connectOrCreate?: TransactionCreateOrConnectWithoutIncomingMessageBatchTransactionInput | undefined;

  @TypeGraphQL.Field(_type => TransactionWhereUniqueInput, {
    nullable: true
  })
  connect?: TransactionWhereUniqueInput | undefined;
}
