import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BlockScalarWhereInput } from "../inputs/BlockScalarWhereInput";
import { BlockUpdateManyMutationInput } from "../inputs/BlockUpdateManyMutationInput";

@TypeGraphQL.InputType("BlockUpdateManyWithWhereWithoutBatchInput", {})
export class BlockUpdateManyWithWhereWithoutBatchInput {
  @TypeGraphQL.Field(_type => BlockScalarWhereInput, {
    nullable: false
  })
  where!: BlockScalarWhereInput;

  @TypeGraphQL.Field(_type => BlockUpdateManyMutationInput, {
    nullable: false
  })
  data!: BlockUpdateManyMutationInput;
}
