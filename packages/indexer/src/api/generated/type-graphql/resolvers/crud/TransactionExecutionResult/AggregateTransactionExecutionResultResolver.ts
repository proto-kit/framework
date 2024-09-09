import * as TypeGraphQL from "type-graphql";
import type { GraphQLResolveInfo } from "graphql";
import { AggregateTransactionExecutionResultArgs } from "./args/AggregateTransactionExecutionResultArgs";
import { TransactionExecutionResult } from "../../../models/TransactionExecutionResult";
import { AggregateTransactionExecutionResult } from "../../outputs/AggregateTransactionExecutionResult";
import { transformInfoIntoPrismaArgs, getPrismaFromContext, transformCountFieldIntoSelectRelationsCount } from "../../../helpers";

@TypeGraphQL.Resolver(_of => TransactionExecutionResult)
export class AggregateTransactionExecutionResultResolver {
  @TypeGraphQL.Query(_returns => AggregateTransactionExecutionResult, {
    nullable: false
  })
  async aggregateTransactionExecutionResult(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: AggregateTransactionExecutionResultArgs): Promise<AggregateTransactionExecutionResult> {
    return getPrismaFromContext(ctx).transactionExecutionResult.aggregate({
      ...args,
      ...transformInfoIntoPrismaArgs(info),
    });
  }
}
