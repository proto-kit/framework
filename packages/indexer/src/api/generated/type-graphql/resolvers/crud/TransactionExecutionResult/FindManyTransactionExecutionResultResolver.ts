import * as TypeGraphQL from "type-graphql";
import type { GraphQLResolveInfo } from "graphql";
import { FindManyTransactionExecutionResultArgs } from "./args/FindManyTransactionExecutionResultArgs";
import { TransactionExecutionResult } from "../../../models/TransactionExecutionResult";
import { transformInfoIntoPrismaArgs, getPrismaFromContext, transformCountFieldIntoSelectRelationsCount } from "../../../helpers";

@TypeGraphQL.Resolver(_of => TransactionExecutionResult)
export class FindManyTransactionExecutionResultResolver {
  @TypeGraphQL.Query(_returns => [TransactionExecutionResult], {
    nullable: false
  })
  async transactionExecutionResults(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: FindManyTransactionExecutionResultArgs): Promise<TransactionExecutionResult[]> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).transactionExecutionResult.findMany({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }
}
