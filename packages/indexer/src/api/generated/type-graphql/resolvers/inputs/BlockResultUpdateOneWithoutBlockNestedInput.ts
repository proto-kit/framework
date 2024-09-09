import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BlockResultCreateOrConnectWithoutBlockInput } from "../inputs/BlockResultCreateOrConnectWithoutBlockInput";
import { BlockResultCreateWithoutBlockInput } from "../inputs/BlockResultCreateWithoutBlockInput";
import { BlockResultUpdateToOneWithWhereWithoutBlockInput } from "../inputs/BlockResultUpdateToOneWithWhereWithoutBlockInput";
import { BlockResultUpsertWithoutBlockInput } from "../inputs/BlockResultUpsertWithoutBlockInput";
import { BlockResultWhereInput } from "../inputs/BlockResultWhereInput";
import { BlockResultWhereUniqueInput } from "../inputs/BlockResultWhereUniqueInput";

@TypeGraphQL.InputType("BlockResultUpdateOneWithoutBlockNestedInput", {})
export class BlockResultUpdateOneWithoutBlockNestedInput {
  @TypeGraphQL.Field(_type => BlockResultCreateWithoutBlockInput, {
    nullable: true
  })
  create?: BlockResultCreateWithoutBlockInput | undefined;

  @TypeGraphQL.Field(_type => BlockResultCreateOrConnectWithoutBlockInput, {
    nullable: true
  })
  connectOrCreate?: BlockResultCreateOrConnectWithoutBlockInput | undefined;

  @TypeGraphQL.Field(_type => BlockResultUpsertWithoutBlockInput, {
    nullable: true
  })
  upsert?: BlockResultUpsertWithoutBlockInput | undefined;

  @TypeGraphQL.Field(_type => BlockResultWhereInput, {
    nullable: true
  })
  disconnect?: BlockResultWhereInput | undefined;

  @TypeGraphQL.Field(_type => BlockResultWhereInput, {
    nullable: true
  })
  delete?: BlockResultWhereInput | undefined;

  @TypeGraphQL.Field(_type => BlockResultWhereUniqueInput, {
    nullable: true
  })
  connect?: BlockResultWhereUniqueInput | undefined;

  @TypeGraphQL.Field(_type => BlockResultUpdateToOneWithWhereWithoutBlockInput, {
    nullable: true
  })
  update?: BlockResultUpdateToOneWithWhereWithoutBlockInput | undefined;
}
