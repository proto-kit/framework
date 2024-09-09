import * as TypeGraphQL from "type-graphql";
import type { GraphQLResolveInfo } from "graphql";
import { FindUniqueTransactionExecutionResultArgs } from "./args/FindUniqueTransactionExecutionResultArgs";
import { TransactionExecutionResult } from "../../../models/TransactionExecutionResult";
import { transformInfoIntoPrismaArgs, getPrismaFromContext, transformCountFieldIntoSelectRelationsCount } from "../../../helpers";

@TypeGraphQL.Resolver(_of => TransactionExecutionResult)
export class FindUniqueTransactionExecutionResultResolver {
  @TypeGraphQL.Query(_returns => TransactionExecutionResult, {
    nullable: true
  })
  async transactionExecutionResult(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: FindUniqueTransactionExecutionResultArgs): Promise<TransactionExecutionResult | null> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).transactionExecutionResult.findUnique({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }
}
