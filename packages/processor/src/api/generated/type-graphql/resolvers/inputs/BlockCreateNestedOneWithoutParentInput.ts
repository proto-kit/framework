import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BlockCreateOrConnectWithoutParentInput } from "../inputs/BlockCreateOrConnectWithoutParentInput";
import { BlockCreateWithoutParentInput } from "../inputs/BlockCreateWithoutParentInput";
import { BlockWhereUniqueInput } from "../inputs/BlockWhereUniqueInput";

@TypeGraphQL.InputType("BlockCreateNestedOneWithoutParentInput", {})
export class BlockCreateNestedOneWithoutParentInput {
  @TypeGraphQL.Field(_type => BlockCreateWithoutParentInput, {
    nullable: true
  })
  create?: BlockCreateWithoutParentInput | undefined;

  @TypeGraphQL.Field(_type => BlockCreateOrConnectWithoutParentInput, {
    nullable: true
  })
  connectOrCreate?: BlockCreateOrConnectWithoutParentInput | undefined;

  @TypeGraphQL.Field(_type => BlockWhereUniqueInput, {
    nullable: true
  })
  connect?: BlockWhereUniqueInput | undefined;
}
