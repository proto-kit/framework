import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BlockResultWhereInput } from "../inputs/BlockResultWhereInput";

@TypeGraphQL.InputType("BlockResultNullableRelationFilter", {})
export class BlockResultNullableRelationFilter {
  @TypeGraphQL.Field(_type => BlockResultWhereInput, {
    nullable: true
  })
  is?: BlockResultWhereInput | undefined;

  @TypeGraphQL.Field(_type => BlockResultWhereInput, {
    nullable: true
  })
  isNot?: BlockResultWhereInput | undefined;
}
