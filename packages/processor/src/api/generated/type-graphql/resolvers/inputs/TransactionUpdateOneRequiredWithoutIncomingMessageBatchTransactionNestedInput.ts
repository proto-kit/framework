import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { TransactionCreateOrConnectWithoutIncomingMessageBatchTransactionInput } from "../inputs/TransactionCreateOrConnectWithoutIncomingMessageBatchTransactionInput";
import { TransactionCreateWithoutIncomingMessageBatchTransactionInput } from "../inputs/TransactionCreateWithoutIncomingMessageBatchTransactionInput";
import { TransactionUpdateToOneWithWhereWithoutIncomingMessageBatchTransactionInput } from "../inputs/TransactionUpdateToOneWithWhereWithoutIncomingMessageBatchTransactionInput";
import { TransactionUpsertWithoutIncomingMessageBatchTransactionInput } from "../inputs/TransactionUpsertWithoutIncomingMessageBatchTransactionInput";
import { TransactionWhereUniqueInput } from "../inputs/TransactionWhereUniqueInput";

@TypeGraphQL.InputType("TransactionUpdateOneRequiredWithoutIncomingMessageBatchTransactionNestedInput", {})
export class TransactionUpdateOneRequiredWithoutIncomingMessageBatchTransactionNestedInput {
  @TypeGraphQL.Field(_type => TransactionCreateWithoutIncomingMessageBatchTransactionInput, {
    nullable: true
  })
  create?: TransactionCreateWithoutIncomingMessageBatchTransactionInput | undefined;

  @TypeGraphQL.Field(_type => TransactionCreateOrConnectWithoutIncomingMessageBatchTransactionInput, {
    nullable: true
  })
  connectOrCreate?: TransactionCreateOrConnectWithoutIncomingMessageBatchTransactionInput | undefined;

  @TypeGraphQL.Field(_type => TransactionUpsertWithoutIncomingMessageBatchTransactionInput, {
    nullable: true
  })
  upsert?: TransactionUpsertWithoutIncomingMessageBatchTransactionInput | undefined;

  @TypeGraphQL.Field(_type => TransactionWhereUniqueInput, {
    nullable: true
  })
  connect?: TransactionWhereUniqueInput | undefined;

  @TypeGraphQL.Field(_type => TransactionUpdateToOneWithWhereWithoutIncomingMessageBatchTransactionInput, {
    nullable: true
  })
  update?: TransactionUpdateToOneWithWhereWithoutIncomingMessageBatchTransactionInput | undefined;
}
