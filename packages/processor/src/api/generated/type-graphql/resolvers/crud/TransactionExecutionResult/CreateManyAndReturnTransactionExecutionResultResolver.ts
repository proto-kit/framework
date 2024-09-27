import * as TypeGraphQL from "type-graphql";
import type { GraphQLResolveInfo } from "graphql";
import { CreateManyAndReturnTransactionExecutionResultArgs } from "./args/CreateManyAndReturnTransactionExecutionResultArgs";
import { TransactionExecutionResult } from "../../../models/TransactionExecutionResult";
import { CreateManyAndReturnTransactionExecutionResult } from "../../outputs/CreateManyAndReturnTransactionExecutionResult";
import { transformInfoIntoPrismaArgs, getPrismaFromContext, transformCountFieldIntoSelectRelationsCount } from "../../../helpers";

@TypeGraphQL.Resolver(_of => TransactionExecutionResult)
export class CreateManyAndReturnTransactionExecutionResultResolver {
  @TypeGraphQL.Mutation(_returns => [CreateManyAndReturnTransactionExecutionResult], {
    nullable: false
  })
  async createManyAndReturnTransactionExecutionResult(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: CreateManyAndReturnTransactionExecutionResultArgs): Promise<CreateManyAndReturnTransactionExecutionResult[]> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).transactionExecutionResult.createManyAndReturn({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }
}
