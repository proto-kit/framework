import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BlockWhereInput } from "../inputs/BlockWhereInput";

@TypeGraphQL.InputType("BlockListRelationFilter", {})
export class BlockListRelationFilter {
  @TypeGraphQL.Field(_type => BlockWhereInput, {
    nullable: true
  })
  every?: BlockWhereInput | undefined;

  @TypeGraphQL.Field(_type => BlockWhereInput, {
    nullable: true
  })
  some?: BlockWhereInput | undefined;

  @TypeGraphQL.Field(_type => BlockWhereInput, {
    nullable: true
  })
  none?: BlockWhereInput | undefined;
}
