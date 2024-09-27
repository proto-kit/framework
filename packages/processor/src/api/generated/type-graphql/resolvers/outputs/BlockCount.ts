import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BlockCountTransactionsArgs } from "./args/BlockCountTransactionsArgs";

@TypeGraphQL.ObjectType("BlockCount", {})
export class BlockCount {
  transactions!: number;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    name: "transactions",
    nullable: false
  })
  getTransactions(@TypeGraphQL.Root() root: BlockCount, @TypeGraphQL.Args() args: BlockCountTransactionsArgs): number {
    return root.transactions;
  }
}
