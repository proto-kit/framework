import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BoolFieldUpdateOperationsInput } from "../inputs/BoolFieldUpdateOperationsInput";
import { IncomingMessageBatchTransactionUpdateManyWithoutTransactionNestedInput } from "../inputs/IncomingMessageBatchTransactionUpdateManyWithoutTransactionNestedInput";
import { StringFieldUpdateOperationsInput } from "../inputs/StringFieldUpdateOperationsInput";
import { TransactionUpdateargsFieldsInput } from "../inputs/TransactionUpdateargsFieldsInput";
import { TransactionUpdateauxiliaryDataInput } from "../inputs/TransactionUpdateauxiliaryDataInput";

@TypeGraphQL.InputType("TransactionUpdateWithoutExecutionResultInput", {})
export class TransactionUpdateWithoutExecutionResultInput {
  @TypeGraphQL.Field(_type => StringFieldUpdateOperationsInput, {
    nullable: true
  })
  hash?: StringFieldUpdateOperationsInput | undefined;

  @TypeGraphQL.Field(_type => StringFieldUpdateOperationsInput, {
    nullable: true
  })
  methodId?: StringFieldUpdateOperationsInput | undefined;

  @TypeGraphQL.Field(_type => StringFieldUpdateOperationsInput, {
    nullable: true
  })
  sender?: StringFieldUpdateOperationsInput | undefined;

  @TypeGraphQL.Field(_type => StringFieldUpdateOperationsInput, {
    nullable: true
  })
  nonce?: StringFieldUpdateOperationsInput | undefined;

  @TypeGraphQL.Field(_type => TransactionUpdateargsFieldsInput, {
    nullable: true
  })
  argsFields?: TransactionUpdateargsFieldsInput | undefined;

  @TypeGraphQL.Field(_type => TransactionUpdateauxiliaryDataInput, {
    nullable: true
  })
  auxiliaryData?: TransactionUpdateauxiliaryDataInput | undefined;

  @TypeGraphQL.Field(_type => StringFieldUpdateOperationsInput, {
    nullable: true
  })
  signature_r?: StringFieldUpdateOperationsInput | undefined;

  @TypeGraphQL.Field(_type => StringFieldUpdateOperationsInput, {
    nullable: true
  })
  signature_s?: StringFieldUpdateOperationsInput | undefined;

  @TypeGraphQL.Field(_type => BoolFieldUpdateOperationsInput, {
    nullable: true
  })
  isMessage?: BoolFieldUpdateOperationsInput | undefined;

  @TypeGraphQL.Field(_type => IncomingMessageBatchTransactionUpdateManyWithoutTransactionNestedInput, {
    nullable: true
  })
  IncomingMessageBatchTransaction?: IncomingMessageBatchTransactionUpdateManyWithoutTransactionNestedInput | undefined;
}
