import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";

@TypeGraphQL.InputType("NullableStringFieldUpdateOperationsInput", {})
export class NullableStringFieldUpdateOperationsInput {
  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  set?: string | undefined;
}
