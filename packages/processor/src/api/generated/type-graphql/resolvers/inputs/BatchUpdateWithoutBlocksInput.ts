import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { IntFieldUpdateOperationsInput } from "../inputs/IntFieldUpdateOperationsInput";
import { SettlementUpdateOneWithoutBatchesNestedInput } from "../inputs/SettlementUpdateOneWithoutBatchesNestedInput";

@TypeGraphQL.InputType("BatchUpdateWithoutBlocksInput", {})
export class BatchUpdateWithoutBlocksInput {
  @TypeGraphQL.Field(_type => IntFieldUpdateOperationsInput, {
    nullable: true
  })
  height?: IntFieldUpdateOperationsInput | undefined;

  @TypeGraphQL.Field(_type => GraphQLScalars.JSONResolver, {
    nullable: true
  })
  proof?: Prisma.InputJsonValue | undefined;

  @TypeGraphQL.Field(_type => SettlementUpdateOneWithoutBatchesNestedInput, {
    nullable: true
  })
  settlement?: SettlementUpdateOneWithoutBatchesNestedInput | undefined;
}
