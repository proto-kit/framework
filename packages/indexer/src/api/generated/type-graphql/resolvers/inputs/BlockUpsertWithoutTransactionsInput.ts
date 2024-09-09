import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BlockCreateWithoutTransactionsInput } from "../inputs/BlockCreateWithoutTransactionsInput";
import { BlockUpdateWithoutTransactionsInput } from "../inputs/BlockUpdateWithoutTransactionsInput";
import { BlockWhereInput } from "../inputs/BlockWhereInput";

@TypeGraphQL.InputType("BlockUpsertWithoutTransactionsInput", {})
export class BlockUpsertWithoutTransactionsInput {
  @TypeGraphQL.Field(_type => BlockUpdateWithoutTransactionsInput, {
    nullable: false
  })
  update!: BlockUpdateWithoutTransactionsInput;

  @TypeGraphQL.Field(_type => BlockCreateWithoutTransactionsInput, {
    nullable: false
  })
  create!: BlockCreateWithoutTransactionsInput;

  @TypeGraphQL.Field(_type => BlockWhereInput, {
    nullable: true
  })
  where?: BlockWhereInput | undefined;
}
