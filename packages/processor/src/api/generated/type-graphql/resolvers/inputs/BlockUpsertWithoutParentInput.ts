import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BlockCreateWithoutParentInput } from "../inputs/BlockCreateWithoutParentInput";
import { BlockUpdateWithoutParentInput } from "../inputs/BlockUpdateWithoutParentInput";
import { BlockWhereInput } from "../inputs/BlockWhereInput";

@TypeGraphQL.InputType("BlockUpsertWithoutParentInput", {})
export class BlockUpsertWithoutParentInput {
  @TypeGraphQL.Field(_type => BlockUpdateWithoutParentInput, {
    nullable: false
  })
  update!: BlockUpdateWithoutParentInput;

  @TypeGraphQL.Field(_type => BlockCreateWithoutParentInput, {
    nullable: false
  })
  create!: BlockCreateWithoutParentInput;

  @TypeGraphQL.Field(_type => BlockWhereInput, {
    nullable: true
  })
  where?: BlockWhereInput | undefined;
}
