import * as TypeGraphQL from "type-graphql";
import type { GraphQLResolveInfo } from "graphql";
import { FindManyIncomingMessageBatchTransactionArgs } from "./args/FindManyIncomingMessageBatchTransactionArgs";
import { IncomingMessageBatchTransaction } from "../../../models/IncomingMessageBatchTransaction";
import { transformInfoIntoPrismaArgs, getPrismaFromContext, transformCountFieldIntoSelectRelationsCount } from "../../../helpers";

@TypeGraphQL.Resolver(_of => IncomingMessageBatchTransaction)
export class FindManyIncomingMessageBatchTransactionResolver {
  @TypeGraphQL.Query(_returns => [IncomingMessageBatchTransaction], {
    nullable: false
  })
  async incomingMessageBatchTransactions(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: FindManyIncomingMessageBatchTransactionArgs): Promise<IncomingMessageBatchTransaction[]> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).incomingMessageBatchTransaction.findMany({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }
}
