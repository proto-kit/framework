import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { TransactionCountIncomingMessageBatchTransactionArgs } from "./args/TransactionCountIncomingMessageBatchTransactionArgs";

@TypeGraphQL.ObjectType("TransactionCount", {})
export class TransactionCount {
  IncomingMessageBatchTransaction!: number;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    name: "IncomingMessageBatchTransaction",
    nullable: false
  })
  getIncomingMessageBatchTransaction(@TypeGraphQL.Root() root: TransactionCount, @TypeGraphQL.Args() args: TransactionCountIncomingMessageBatchTransactionArgs): number {
    return root.IncomingMessageBatchTransaction;
  }
}
