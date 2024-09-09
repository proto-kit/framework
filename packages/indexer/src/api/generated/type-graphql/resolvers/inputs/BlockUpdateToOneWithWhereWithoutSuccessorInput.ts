import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BlockUpdateWithoutSuccessorInput } from "../inputs/BlockUpdateWithoutSuccessorInput";
import { BlockWhereInput } from "../inputs/BlockWhereInput";

@TypeGraphQL.InputType("BlockUpdateToOneWithWhereWithoutSuccessorInput", {})
export class BlockUpdateToOneWithWhereWithoutSuccessorInput {
  @TypeGraphQL.Field(_type => BlockWhereInput, {
    nullable: true
  })
  where?: BlockWhereInput | undefined;

  @TypeGraphQL.Field(_type => BlockUpdateWithoutSuccessorInput, {
    nullable: false
  })
  data!: BlockUpdateWithoutSuccessorInput;
}
