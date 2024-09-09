import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BlockCreateWithoutBatchInput } from "../inputs/BlockCreateWithoutBatchInput";
import { BlockUpdateWithoutBatchInput } from "../inputs/BlockUpdateWithoutBatchInput";
import { BlockWhereUniqueInput } from "../inputs/BlockWhereUniqueInput";

@TypeGraphQL.InputType("BlockUpsertWithWhereUniqueWithoutBatchInput", {})
export class BlockUpsertWithWhereUniqueWithoutBatchInput {
  @TypeGraphQL.Field(_type => BlockWhereUniqueInput, {
    nullable: false
  })
  where!: BlockWhereUniqueInput;

  @TypeGraphQL.Field(_type => BlockUpdateWithoutBatchInput, {
    nullable: false
  })
  update!: BlockUpdateWithoutBatchInput;

  @TypeGraphQL.Field(_type => BlockCreateWithoutBatchInput, {
    nullable: false
  })
  create!: BlockCreateWithoutBatchInput;
}
