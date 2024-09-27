import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BatchUpdateOneWithoutBlocksNestedInput } from "../inputs/BatchUpdateOneWithoutBlocksNestedInput";
import { BlockResultUpdateOneWithoutBlockNestedInput } from "../inputs/BlockResultUpdateOneWithoutBlockNestedInput";
import { BlockUpdateOneWithoutSuccessorNestedInput } from "../inputs/BlockUpdateOneWithoutSuccessorNestedInput";
import { IntFieldUpdateOperationsInput } from "../inputs/IntFieldUpdateOperationsInput";
import { StringFieldUpdateOperationsInput } from "../inputs/StringFieldUpdateOperationsInput";
import { TransactionExecutionResultUpdateManyWithoutBlockNestedInput } from "../inputs/TransactionExecutionResultUpdateManyWithoutBlockNestedInput";

@TypeGraphQL.InputType("BlockUpdateWithoutSuccessorInput", {})
export class BlockUpdateWithoutSuccessorInput {
  @TypeGraphQL.Field(_type => StringFieldUpdateOperationsInput, {
    nullable: true
  })
  hash?: StringFieldUpdateOperationsInput | undefined;

  @TypeGraphQL.Field(_type => StringFieldUpdateOperationsInput, {
    nullable: true
  })
  transactionsHash?: StringFieldUpdateOperationsInput | undefined;

  @TypeGraphQL.Field(_type => GraphQLScalars.JSONResolver, {
    nullable: true
  })
  beforeNetworkState?: Prisma.InputJsonValue | undefined;

  @TypeGraphQL.Field(_type => GraphQLScalars.JSONResolver, {
    nullable: true
  })
  duringNetworkState?: Prisma.InputJsonValue | undefined;

  @TypeGraphQL.Field(_type => IntFieldUpdateOperationsInput, {
    nullable: true
  })
  height?: IntFieldUpdateOperationsInput | undefined;

  @TypeGraphQL.Field(_type => StringFieldUpdateOperationsInput, {
    nullable: true
  })
  fromEternalTransactionsHash?: StringFieldUpdateOperationsInput | undefined;

  @TypeGraphQL.Field(_type => StringFieldUpdateOperationsInput, {
    nullable: true
  })
  toEternalTransactionsHash?: StringFieldUpdateOperationsInput | undefined;

  @TypeGraphQL.Field(_type => StringFieldUpdateOperationsInput, {
    nullable: true
  })
  fromBlockHashRoot?: StringFieldUpdateOperationsInput | undefined;

  @TypeGraphQL.Field(_type => StringFieldUpdateOperationsInput, {
    nullable: true
  })
  fromMessagesHash?: StringFieldUpdateOperationsInput | undefined;

  @TypeGraphQL.Field(_type => StringFieldUpdateOperationsInput, {
    nullable: true
  })
  toMessagesHash?: StringFieldUpdateOperationsInput | undefined;

  @TypeGraphQL.Field(_type => BlockUpdateOneWithoutSuccessorNestedInput, {
    nullable: true
  })
  parent?: BlockUpdateOneWithoutSuccessorNestedInput | undefined;

  @TypeGraphQL.Field(_type => TransactionExecutionResultUpdateManyWithoutBlockNestedInput, {
    nullable: true
  })
  transactions?: TransactionExecutionResultUpdateManyWithoutBlockNestedInput | undefined;

  @TypeGraphQL.Field(_type => BlockResultUpdateOneWithoutBlockNestedInput, {
    nullable: true
  })
  result?: BlockResultUpdateOneWithoutBlockNestedInput | undefined;

  @TypeGraphQL.Field(_type => BatchUpdateOneWithoutBlocksNestedInput, {
    nullable: true
  })
  batch?: BatchUpdateOneWithoutBlocksNestedInput | undefined;
}
