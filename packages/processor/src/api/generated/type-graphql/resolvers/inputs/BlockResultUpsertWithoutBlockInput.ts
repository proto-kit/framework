import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BlockResultCreateWithoutBlockInput } from "../inputs/BlockResultCreateWithoutBlockInput";
import { BlockResultUpdateWithoutBlockInput } from "../inputs/BlockResultUpdateWithoutBlockInput";
import { BlockResultWhereInput } from "../inputs/BlockResultWhereInput";

@TypeGraphQL.InputType("BlockResultUpsertWithoutBlockInput", {})
export class BlockResultUpsertWithoutBlockInput {
  @TypeGraphQL.Field(_type => BlockResultUpdateWithoutBlockInput, {
    nullable: false
  })
  update!: BlockResultUpdateWithoutBlockInput;

  @TypeGraphQL.Field(_type => BlockResultCreateWithoutBlockInput, {
    nullable: false
  })
  create!: BlockResultCreateWithoutBlockInput;

  @TypeGraphQL.Field(_type => BlockResultWhereInput, {
    nullable: true
  })
  where?: BlockResultWhereInput | undefined;
}
