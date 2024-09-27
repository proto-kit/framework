import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { TransactionUpdateOneRequiredWithoutIncomingMessageBatchTransactionNestedInput } from "../inputs/TransactionUpdateOneRequiredWithoutIncomingMessageBatchTransactionNestedInput";

@TypeGraphQL.InputType("IncomingMessageBatchTransactionUpdateWithoutBatchInput", {})
export class IncomingMessageBatchTransactionUpdateWithoutBatchInput {
  @TypeGraphQL.Field(_type => TransactionUpdateOneRequiredWithoutIncomingMessageBatchTransactionNestedInput, {
    nullable: true
  })
  transaction?: TransactionUpdateOneRequiredWithoutIncomingMessageBatchTransactionNestedInput | undefined;
}
