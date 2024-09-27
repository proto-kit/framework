import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BatchUpdateManyWithoutSettlementNestedInput } from "../inputs/BatchUpdateManyWithoutSettlementNestedInput";
import { StringFieldUpdateOperationsInput } from "../inputs/StringFieldUpdateOperationsInput";

@TypeGraphQL.InputType("SettlementUpdateInput", {})
export class SettlementUpdateInput {
  @TypeGraphQL.Field(_type => StringFieldUpdateOperationsInput, {
    nullable: true
  })
  transactionHash?: StringFieldUpdateOperationsInput | undefined;

  @TypeGraphQL.Field(_type => StringFieldUpdateOperationsInput, {
    nullable: true
  })
  promisedMessagesHash?: StringFieldUpdateOperationsInput | undefined;

  @TypeGraphQL.Field(_type => BatchUpdateManyWithoutSettlementNestedInput, {
    nullable: true
  })
  batches?: BatchUpdateManyWithoutSettlementNestedInput | undefined;
}
