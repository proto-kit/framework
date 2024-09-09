import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BlockResultCreateOrConnectWithoutBlockInput } from "../inputs/BlockResultCreateOrConnectWithoutBlockInput";
import { BlockResultCreateWithoutBlockInput } from "../inputs/BlockResultCreateWithoutBlockInput";
import { BlockResultWhereUniqueInput } from "../inputs/BlockResultWhereUniqueInput";

@TypeGraphQL.InputType("BlockResultCreateNestedOneWithoutBlockInput", {})
export class BlockResultCreateNestedOneWithoutBlockInput {
  @TypeGraphQL.Field(_type => BlockResultCreateWithoutBlockInput, {
    nullable: true
  })
  create?: BlockResultCreateWithoutBlockInput | undefined;

  @TypeGraphQL.Field(_type => BlockResultCreateOrConnectWithoutBlockInput, {
    nullable: true
  })
  connectOrCreate?: BlockResultCreateOrConnectWithoutBlockInput | undefined;

  @TypeGraphQL.Field(_type => BlockResultWhereUniqueInput, {
    nullable: true
  })
  connect?: BlockResultWhereUniqueInput | undefined;
}
