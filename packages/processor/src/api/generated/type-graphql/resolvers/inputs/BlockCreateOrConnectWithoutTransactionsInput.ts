import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BlockCreateWithoutTransactionsInput } from "../inputs/BlockCreateWithoutTransactionsInput";
import { BlockWhereUniqueInput } from "../inputs/BlockWhereUniqueInput";

@TypeGraphQL.InputType("BlockCreateOrConnectWithoutTransactionsInput", {})
export class BlockCreateOrConnectWithoutTransactionsInput {
  @TypeGraphQL.Field(_type => BlockWhereUniqueInput, {
    nullable: false
  })
  where!: BlockWhereUniqueInput;

  @TypeGraphQL.Field(_type => BlockCreateWithoutTransactionsInput, {
    nullable: false
  })
  create!: BlockCreateWithoutTransactionsInput;
}
