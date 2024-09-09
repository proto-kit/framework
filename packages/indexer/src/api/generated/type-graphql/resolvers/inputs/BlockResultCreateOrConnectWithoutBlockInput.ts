import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BlockResultCreateWithoutBlockInput } from "../inputs/BlockResultCreateWithoutBlockInput";
import { BlockResultWhereUniqueInput } from "../inputs/BlockResultWhereUniqueInput";

@TypeGraphQL.InputType("BlockResultCreateOrConnectWithoutBlockInput", {})
export class BlockResultCreateOrConnectWithoutBlockInput {
  @TypeGraphQL.Field(_type => BlockResultWhereUniqueInput, {
    nullable: false
  })
  where!: BlockResultWhereUniqueInput;

  @TypeGraphQL.Field(_type => BlockResultCreateWithoutBlockInput, {
    nullable: false
  })
  create!: BlockResultCreateWithoutBlockInput;
}
