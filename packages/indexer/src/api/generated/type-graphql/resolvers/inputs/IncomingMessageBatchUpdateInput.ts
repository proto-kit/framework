import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { IncomingMessageBatchTransactionUpdateManyWithoutBatchNestedInput } from "../inputs/IncomingMessageBatchTransactionUpdateManyWithoutBatchNestedInput";
import { StringFieldUpdateOperationsInput } from "../inputs/StringFieldUpdateOperationsInput";

@TypeGraphQL.InputType("IncomingMessageBatchUpdateInput", {})
export class IncomingMessageBatchUpdateInput {
  @TypeGraphQL.Field(_type => StringFieldUpdateOperationsInput, {
    nullable: true
  })
  fromMessageHash?: StringFieldUpdateOperationsInput | undefined;

  @TypeGraphQL.Field(_type => StringFieldUpdateOperationsInput, {
    nullable: true
  })
  toMessageHash?: StringFieldUpdateOperationsInput | undefined;

  @TypeGraphQL.Field(_type => IncomingMessageBatchTransactionUpdateManyWithoutBatchNestedInput, {
    nullable: true
  })
  messages?: IncomingMessageBatchTransactionUpdateManyWithoutBatchNestedInput | undefined;
}
