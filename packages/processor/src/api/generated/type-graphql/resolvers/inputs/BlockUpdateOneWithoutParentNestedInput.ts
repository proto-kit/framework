import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BlockCreateOrConnectWithoutParentInput } from "../inputs/BlockCreateOrConnectWithoutParentInput";
import { BlockCreateWithoutParentInput } from "../inputs/BlockCreateWithoutParentInput";
import { BlockUpdateToOneWithWhereWithoutParentInput } from "../inputs/BlockUpdateToOneWithWhereWithoutParentInput";
import { BlockUpsertWithoutParentInput } from "../inputs/BlockUpsertWithoutParentInput";
import { BlockWhereInput } from "../inputs/BlockWhereInput";
import { BlockWhereUniqueInput } from "../inputs/BlockWhereUniqueInput";

@TypeGraphQL.InputType("BlockUpdateOneWithoutParentNestedInput", {})
export class BlockUpdateOneWithoutParentNestedInput {
  @TypeGraphQL.Field(_type => BlockCreateWithoutParentInput, {
    nullable: true
  })
  create?: BlockCreateWithoutParentInput | undefined;

  @TypeGraphQL.Field(_type => BlockCreateOrConnectWithoutParentInput, {
    nullable: true
  })
  connectOrCreate?: BlockCreateOrConnectWithoutParentInput | undefined;

  @TypeGraphQL.Field(_type => BlockUpsertWithoutParentInput, {
    nullable: true
  })
  upsert?: BlockUpsertWithoutParentInput | undefined;

  @TypeGraphQL.Field(_type => BlockWhereInput, {
    nullable: true
  })
  disconnect?: BlockWhereInput | undefined;

  @TypeGraphQL.Field(_type => BlockWhereInput, {
    nullable: true
  })
  delete?: BlockWhereInput | undefined;

  @TypeGraphQL.Field(_type => BlockWhereUniqueInput, {
    nullable: true
  })
  connect?: BlockWhereUniqueInput | undefined;

  @TypeGraphQL.Field(_type => BlockUpdateToOneWithWhereWithoutParentInput, {
    nullable: true
  })
  update?: BlockUpdateToOneWithWhereWithoutParentInput | undefined;
}
