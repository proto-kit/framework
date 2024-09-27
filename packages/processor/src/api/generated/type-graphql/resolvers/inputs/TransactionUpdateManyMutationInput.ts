import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BoolFieldUpdateOperationsInput } from "../inputs/BoolFieldUpdateOperationsInput";
import { StringFieldUpdateOperationsInput } from "../inputs/StringFieldUpdateOperationsInput";
import { TransactionUpdateargsFieldsInput } from "../inputs/TransactionUpdateargsFieldsInput";
import { TransactionUpdateauxiliaryDataInput } from "../inputs/TransactionUpdateauxiliaryDataInput";

@TypeGraphQL.InputType("TransactionUpdateManyMutationInput", {})
export class TransactionUpdateManyMutationInput {
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
}
