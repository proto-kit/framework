import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BlockCreateWithoutSuccessorInput } from "../inputs/BlockCreateWithoutSuccessorInput";
import { BlockUpdateWithoutSuccessorInput } from "../inputs/BlockUpdateWithoutSuccessorInput";
import { BlockWhereInput } from "../inputs/BlockWhereInput";

@TypeGraphQL.InputType("BlockUpsertWithoutSuccessorInput", {})
export class BlockUpsertWithoutSuccessorInput {
  @TypeGraphQL.Field(_type => BlockUpdateWithoutSuccessorInput, {
    nullable: false
  })
  update!: BlockUpdateWithoutSuccessorInput;

  @TypeGraphQL.Field(_type => BlockCreateWithoutSuccessorInput, {
    nullable: false
  })
  create!: BlockCreateWithoutSuccessorInput;

  @TypeGraphQL.Field(_type => BlockWhereInput, {
    nullable: true
  })
  where?: BlockWhereInput | undefined;
}
