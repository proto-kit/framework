import * as TypeGraphQL from "type-graphql";
import type { GraphQLResolveInfo } from "graphql";
import { FindFirstIncomingMessageBatchTransactionOrThrowArgs } from "./args/FindFirstIncomingMessageBatchTransactionOrThrowArgs";
import { IncomingMessageBatchTransaction } from "../../../models/IncomingMessageBatchTransaction";
import { transformInfoIntoPrismaArgs, getPrismaFromContext, transformCountFieldIntoSelectRelationsCount } from "../../../helpers";

@TypeGraphQL.Resolver(_of => IncomingMessageBatchTransaction)
export class FindFirstIncomingMessageBatchTransactionOrThrowResolver {
  @TypeGraphQL.Query(_returns => IncomingMessageBatchTransaction, {
    nullable: true
  })
  async findFirstIncomingMessageBatchTransactionOrThrow(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: FindFirstIncomingMessageBatchTransactionOrThrowArgs): Promise<IncomingMessageBatchTransaction | null> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).incomingMessageBatchTransaction.findFirstOrThrow({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }
}
