import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { DecimalFieldUpdateOperationsInput } from "../inputs/DecimalFieldUpdateOperationsInput";
import { StateUpdatevaluesInput } from "../inputs/StateUpdatevaluesInput";
import { StringFieldUpdateOperationsInput } from "../inputs/StringFieldUpdateOperationsInput";

@TypeGraphQL.InputType("StateUpdateInput", {})
export class StateUpdateInput {
  @TypeGraphQL.Field(_type => DecimalFieldUpdateOperationsInput, {
    nullable: true
  })
  path?: DecimalFieldUpdateOperationsInput | undefined;

  @TypeGraphQL.Field(_type => StateUpdatevaluesInput, {
    nullable: true
  })
  values?: StateUpdatevaluesInput | undefined;

  @TypeGraphQL.Field(_type => StringFieldUpdateOperationsInput, {
    nullable: true
  })
  mask?: StringFieldUpdateOperationsInput | undefined;
}
