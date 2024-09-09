import * as TypeGraphQL from "type-graphql";
import type { GraphQLResolveInfo } from "graphql";
import { IncomingMessageBatchTransaction } from "../../../models/IncomingMessageBatchTransaction";
import { Transaction } from "../../../models/Transaction";
import { TransactionExecutionResult } from "../../../models/TransactionExecutionResult";
import { TransactionExecutionResultArgs } from "./args/TransactionExecutionResultArgs";
import { TransactionIncomingMessageBatchTransactionArgs } from "./args/TransactionIncomingMessageBatchTransactionArgs";
import { transformInfoIntoPrismaArgs, getPrismaFromContext, transformCountFieldIntoSelectRelationsCount } from "../../../helpers";

@TypeGraphQL.Resolver(_of => Transaction)
export class TransactionRelationsResolver {
  @TypeGraphQL.FieldResolver(_type => TransactionExecutionResult, {
    nullable: true
  })
  async executionResult(@TypeGraphQL.Root() transaction: Transaction, @TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: TransactionExecutionResultArgs): Promise<TransactionExecutionResult | null> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).transaction.findUniqueOrThrow({
      where: {
        hash: transaction.hash,
      },
    }).executionResult({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }

  @TypeGraphQL.FieldResolver(_type => [IncomingMessageBatchTransaction], {
    nullable: false
  })
  async IncomingMessageBatchTransaction(@TypeGraphQL.Root() transaction: Transaction, @TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: TransactionIncomingMessageBatchTransactionArgs): Promise<IncomingMessageBatchTransaction[]> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).transaction.findUniqueOrThrow({
      where: {
        hash: transaction.hash,
      },
    }).IncomingMessageBatchTransaction({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }
}
