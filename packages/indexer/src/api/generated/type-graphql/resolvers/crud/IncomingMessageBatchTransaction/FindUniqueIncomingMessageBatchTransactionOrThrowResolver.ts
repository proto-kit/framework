import * as TypeGraphQL from "type-graphql";
import type { GraphQLResolveInfo } from "graphql";
import { FindUniqueIncomingMessageBatchTransactionOrThrowArgs } from "./args/FindUniqueIncomingMessageBatchTransactionOrThrowArgs";
import { IncomingMessageBatchTransaction } from "../../../models/IncomingMessageBatchTransaction";
import { transformInfoIntoPrismaArgs, getPrismaFromContext, transformCountFieldIntoSelectRelationsCount } from "../../../helpers";

@TypeGraphQL.Resolver(_of => IncomingMessageBatchTransaction)
export class FindUniqueIncomingMessageBatchTransactionOrThrowResolver {
  @TypeGraphQL.Query(_returns => IncomingMessageBatchTransaction, {
    nullable: true
  })
  async getIncomingMessageBatchTransaction(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: FindUniqueIncomingMessageBatchTransactionOrThrowArgs): Promise<IncomingMessageBatchTransaction | null> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).incomingMessageBatchTransaction.findUniqueOrThrow({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }
}
