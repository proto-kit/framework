import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { TransactionUpdateWithoutIncomingMessageBatchTransactionInput } from "../inputs/TransactionUpdateWithoutIncomingMessageBatchTransactionInput";
import { TransactionWhereInput } from "../inputs/TransactionWhereInput";

@TypeGraphQL.InputType("TransactionUpdateToOneWithWhereWithoutIncomingMessageBatchTransactionInput", {})
export class TransactionUpdateToOneWithWhereWithoutIncomingMessageBatchTransactionInput {
  @TypeGraphQL.Field(_type => TransactionWhereInput, {
    nullable: true
  })
  where?: TransactionWhereInput | undefined;

  @TypeGraphQL.Field(_type => TransactionUpdateWithoutIncomingMessageBatchTransactionInput, {
    nullable: false
  })
  data!: TransactionUpdateWithoutIncomingMessageBatchTransactionInput;
}
