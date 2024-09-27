import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { IncomingMessageBatchUpdateOneRequiredWithoutMessagesNestedInput } from "../inputs/IncomingMessageBatchUpdateOneRequiredWithoutMessagesNestedInput";
import { TransactionUpdateOneRequiredWithoutIncomingMessageBatchTransactionNestedInput } from "../inputs/TransactionUpdateOneRequiredWithoutIncomingMessageBatchTransactionNestedInput";

@TypeGraphQL.InputType("IncomingMessageBatchTransactionUpdateInput", {})
export class IncomingMessageBatchTransactionUpdateInput {
  @TypeGraphQL.Field(_type => TransactionUpdateOneRequiredWithoutIncomingMessageBatchTransactionNestedInput, {
    nullable: true
  })
  transaction?: TransactionUpdateOneRequiredWithoutIncomingMessageBatchTransactionNestedInput | undefined;

  @TypeGraphQL.Field(_type => IncomingMessageBatchUpdateOneRequiredWithoutMessagesNestedInput, {
    nullable: true
  })
  batch?: IncomingMessageBatchUpdateOneRequiredWithoutMessagesNestedInput | undefined;
}
