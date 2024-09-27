import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { TransactionCreateNestedOneWithoutIncomingMessageBatchTransactionInput } from "../inputs/TransactionCreateNestedOneWithoutIncomingMessageBatchTransactionInput";

@TypeGraphQL.InputType("IncomingMessageBatchTransactionCreateWithoutBatchInput", {})
export class IncomingMessageBatchTransactionCreateWithoutBatchInput {
  @TypeGraphQL.Field(_type => TransactionCreateNestedOneWithoutIncomingMessageBatchTransactionInput, {
    nullable: false
  })
  transaction!: TransactionCreateNestedOneWithoutIncomingMessageBatchTransactionInput;
}
