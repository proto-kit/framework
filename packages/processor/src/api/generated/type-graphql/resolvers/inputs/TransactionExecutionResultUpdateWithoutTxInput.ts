import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BlockUpdateOneRequiredWithoutTransactionsNestedInput } from "../inputs/BlockUpdateOneRequiredWithoutTransactionsNestedInput";
import { BoolFieldUpdateOperationsInput } from "../inputs/BoolFieldUpdateOperationsInput";
import { NullableStringFieldUpdateOperationsInput } from "../inputs/NullableStringFieldUpdateOperationsInput";

@TypeGraphQL.InputType("TransactionExecutionResultUpdateWithoutTxInput", {})
export class TransactionExecutionResultUpdateWithoutTxInput {
  @TypeGraphQL.Field(_type => GraphQLScalars.JSONResolver, {
    nullable: true
  })
  stateTransitions?: Prisma.InputJsonValue | undefined;

  @TypeGraphQL.Field(_type => GraphQLScalars.JSONResolver, {
    nullable: true
  })
  protocolTransitions?: Prisma.InputJsonValue | undefined;

  @TypeGraphQL.Field(_type => BoolFieldUpdateOperationsInput, {
    nullable: true
  })
  status?: BoolFieldUpdateOperationsInput | undefined;

  @TypeGraphQL.Field(_type => NullableStringFieldUpdateOperationsInput, {
    nullable: true
  })
  statusMessage?: NullableStringFieldUpdateOperationsInput | undefined;

  @TypeGraphQL.Field(_type => BlockUpdateOneRequiredWithoutTransactionsNestedInput, {
    nullable: true
  })
  block?: BlockUpdateOneRequiredWithoutTransactionsNestedInput | undefined;
}
