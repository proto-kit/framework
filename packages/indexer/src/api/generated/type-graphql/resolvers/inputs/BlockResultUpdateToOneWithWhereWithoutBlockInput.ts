import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BlockResultUpdateWithoutBlockInput } from "../inputs/BlockResultUpdateWithoutBlockInput";
import { BlockResultWhereInput } from "../inputs/BlockResultWhereInput";

@TypeGraphQL.InputType("BlockResultUpdateToOneWithWhereWithoutBlockInput", {})
export class BlockResultUpdateToOneWithWhereWithoutBlockInput {
  @TypeGraphQL.Field(_type => BlockResultWhereInput, {
    nullable: true
  })
  where?: BlockResultWhereInput | undefined;

  @TypeGraphQL.Field(_type => BlockResultUpdateWithoutBlockInput, {
    nullable: false
  })
  data!: BlockResultUpdateWithoutBlockInput;
}
