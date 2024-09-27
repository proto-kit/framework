import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BlockUpdateWithoutResultInput } from "../inputs/BlockUpdateWithoutResultInput";
import { BlockWhereInput } from "../inputs/BlockWhereInput";

@TypeGraphQL.InputType("BlockUpdateToOneWithWhereWithoutResultInput", {})
export class BlockUpdateToOneWithWhereWithoutResultInput {
  @TypeGraphQL.Field(_type => BlockWhereInput, {
    nullable: true
  })
  where?: BlockWhereInput | undefined;

  @TypeGraphQL.Field(_type => BlockUpdateWithoutResultInput, {
    nullable: false
  })
  data!: BlockUpdateWithoutResultInput;
}
