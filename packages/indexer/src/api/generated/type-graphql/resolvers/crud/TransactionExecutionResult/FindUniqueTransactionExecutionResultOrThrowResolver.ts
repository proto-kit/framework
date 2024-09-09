import * as TypeGraphQL from "type-graphql";
import type { GraphQLResolveInfo } from "graphql";
import { FindUniqueTransactionExecutionResultOrThrowArgs } from "./args/FindUniqueTransactionExecutionResultOrThrowArgs";
import { TransactionExecutionResult } from "../../../models/TransactionExecutionResult";
import { transformInfoIntoPrismaArgs, getPrismaFromContext, transformCountFieldIntoSelectRelationsCount } from "../../../helpers";

@TypeGraphQL.Resolver(_of => TransactionExecutionResult)
export class FindUniqueTransactionExecutionResultOrThrowResolver {
  @TypeGraphQL.Query(_returns => TransactionExecutionResult, {
    nullable: true
  })
  async getTransactionExecutionResult(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: FindUniqueTransactionExecutionResultOrThrowArgs): Promise<TransactionExecutionResult | null> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).transactionExecutionResult.findUniqueOrThrow({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }
}
