import * as TypeGraphQL from "type-graphql";
import type { GraphQLResolveInfo } from "graphql";
import { Block } from "../../../models/Block";
import { Transaction } from "../../../models/Transaction";
import { TransactionExecutionResult } from "../../../models/TransactionExecutionResult";
import { transformInfoIntoPrismaArgs, getPrismaFromContext, transformCountFieldIntoSelectRelationsCount } from "../../../helpers";

@TypeGraphQL.Resolver(_of => TransactionExecutionResult)
export class TransactionExecutionResultRelationsResolver {
  @TypeGraphQL.FieldResolver(_type => Transaction, {
    nullable: false
  })
  async tx(@TypeGraphQL.Root() transactionExecutionResult: TransactionExecutionResult, @TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo): Promise<Transaction> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).transactionExecutionResult.findUniqueOrThrow({
      where: {
        txHash: transactionExecutionResult.txHash,
      },
    }).tx({
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }

  @TypeGraphQL.FieldResolver(_type => Block, {
    nullable: false
  })
  async block(@TypeGraphQL.Root() transactionExecutionResult: TransactionExecutionResult, @TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo): Promise<Block> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).transactionExecutionResult.findUniqueOrThrow({
      where: {
        txHash: transactionExecutionResult.txHash,
      },
    }).block({
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }
}
