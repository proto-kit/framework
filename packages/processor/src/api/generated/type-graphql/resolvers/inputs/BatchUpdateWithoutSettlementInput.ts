import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BlockUpdateManyWithoutBatchNestedInput } from "../inputs/BlockUpdateManyWithoutBatchNestedInput";
import { IntFieldUpdateOperationsInput } from "../inputs/IntFieldUpdateOperationsInput";

@TypeGraphQL.InputType("BatchUpdateWithoutSettlementInput", {})
export class BatchUpdateWithoutSettlementInput {
  @TypeGraphQL.Field(_type => IntFieldUpdateOperationsInput, {
    nullable: true
  })
  height?: IntFieldUpdateOperationsInput | undefined;

  @TypeGraphQL.Field(_type => GraphQLScalars.JSONResolver, {
    nullable: true
  })
  proof?: Prisma.InputJsonValue | undefined;

  @TypeGraphQL.Field(_type => BlockUpdateManyWithoutBatchNestedInput, {
    nullable: true
  })
  blocks?: BlockUpdateManyWithoutBatchNestedInput | undefined;
}
