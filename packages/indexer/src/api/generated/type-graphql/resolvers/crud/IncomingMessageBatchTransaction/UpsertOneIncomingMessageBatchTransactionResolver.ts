import * as TypeGraphQL from "type-graphql";
import type { GraphQLResolveInfo } from "graphql";
import { UpsertOneIncomingMessageBatchTransactionArgs } from "./args/UpsertOneIncomingMessageBatchTransactionArgs";
import { IncomingMessageBatchTransaction } from "../../../models/IncomingMessageBatchTransaction";
import { transformInfoIntoPrismaArgs, getPrismaFromContext, transformCountFieldIntoSelectRelationsCount } from "../../../helpers";

@TypeGraphQL.Resolver(_of => IncomingMessageBatchTransaction)
export class UpsertOneIncomingMessageBatchTransactionResolver {
  @TypeGraphQL.Mutation(_returns => IncomingMessageBatchTransaction, {
    nullable: false
  })
  async upsertOneIncomingMessageBatchTransaction(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: UpsertOneIncomingMessageBatchTransactionArgs): Promise<IncomingMessageBatchTransaction> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).incomingMessageBatchTransaction.upsert({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }
}
