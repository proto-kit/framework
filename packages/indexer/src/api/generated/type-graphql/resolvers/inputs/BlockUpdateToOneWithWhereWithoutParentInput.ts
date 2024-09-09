import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BlockUpdateWithoutParentInput } from "../inputs/BlockUpdateWithoutParentInput";
import { BlockWhereInput } from "../inputs/BlockWhereInput";

@TypeGraphQL.InputType("BlockUpdateToOneWithWhereWithoutParentInput", {})
export class BlockUpdateToOneWithWhereWithoutParentInput {
  @TypeGraphQL.Field(_type => BlockWhereInput, {
    nullable: true
  })
  where?: BlockWhereInput | undefined;

  @TypeGraphQL.Field(_type => BlockUpdateWithoutParentInput, {
    nullable: false
  })
  data!: BlockUpdateWithoutParentInput;
}
