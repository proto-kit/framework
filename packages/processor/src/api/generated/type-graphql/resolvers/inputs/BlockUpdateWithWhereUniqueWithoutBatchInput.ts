import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BlockUpdateWithoutBatchInput } from "../inputs/BlockUpdateWithoutBatchInput";
import { BlockWhereUniqueInput } from "../inputs/BlockWhereUniqueInput";

@TypeGraphQL.InputType("BlockUpdateWithWhereUniqueWithoutBatchInput", {})
export class BlockUpdateWithWhereUniqueWithoutBatchInput {
  @TypeGraphQL.Field(_type => BlockWhereUniqueInput, {
    nullable: false
  })
  where!: BlockWhereUniqueInput;

  @TypeGraphQL.Field(_type => BlockUpdateWithoutBatchInput, {
    nullable: false
  })
  data!: BlockUpdateWithoutBatchInput;
}
