import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BlockWhereInput } from "../inputs/BlockWhereInput";

@TypeGraphQL.InputType("BlockRelationFilter", {})
export class BlockRelationFilter {
  @TypeGraphQL.Field(_type => BlockWhereInput, {
    nullable: true
  })
  is?: BlockWhereInput | undefined;

  @TypeGraphQL.Field(_type => BlockWhereInput, {
    nullable: true
  })
  isNot?: BlockWhereInput | undefined;
}
