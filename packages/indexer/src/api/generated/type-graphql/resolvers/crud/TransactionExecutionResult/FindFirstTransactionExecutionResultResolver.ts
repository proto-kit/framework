import * as TypeGraphQL from "type-graphql";
import type { GraphQLResolveInfo } from "graphql";
import { FindFirstTransactionExecutionResultArgs } from "./args/FindFirstTransactionExecutionResultArgs";
import { TransactionExecutionResult } from "../../../models/TransactionExecutionResult";
import { transformInfoIntoPrismaArgs, getPrismaFromContext, transformCountFieldIntoSelectRelationsCount } from "../../../helpers";

@TypeGraphQL.Resolver(_of => TransactionExecutionResult)
export class FindFirstTransactionExecutionResultResolver {
  @TypeGraphQL.Query(_returns => TransactionExecutionResult, {
    nullable: true
  })
  async findFirstTransactionExecutionResult(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: FindFirstTransactionExecutionResultArgs): Promise<TransactionExecutionResult | null> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).transactionExecutionResult.findFirst({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }
}
