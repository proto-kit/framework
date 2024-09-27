import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BlockUpdateWithoutTransactionsInput } from "../inputs/BlockUpdateWithoutTransactionsInput";
import { BlockWhereInput } from "../inputs/BlockWhereInput";

@TypeGraphQL.InputType("BlockUpdateToOneWithWhereWithoutTransactionsInput", {})
export class BlockUpdateToOneWithWhereWithoutTransactionsInput {
  @TypeGraphQL.Field(_type => BlockWhereInput, {
    nullable: true
  })
  where?: BlockWhereInput | undefined;

  @TypeGraphQL.Field(_type => BlockUpdateWithoutTransactionsInput, {
    nullable: false
  })
  data!: BlockUpdateWithoutTransactionsInput;
}
