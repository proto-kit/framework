import * as TypeGraphQL from "type-graphql";
import type { GraphQLResolveInfo } from "graphql";
import { UpdateOneIncomingMessageBatchTransactionArgs } from "./args/UpdateOneIncomingMessageBatchTransactionArgs";
import { IncomingMessageBatchTransaction } from "../../../models/IncomingMessageBatchTransaction";
import { transformInfoIntoPrismaArgs, getPrismaFromContext, transformCountFieldIntoSelectRelationsCount } from "../../../helpers";

@TypeGraphQL.Resolver(_of => IncomingMessageBatchTransaction)
export class UpdateOneIncomingMessageBatchTransactionResolver {
  @TypeGraphQL.Mutation(_returns => IncomingMessageBatchTransaction, {
    nullable: true
  })
  async updateOneIncomingMessageBatchTransaction(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: UpdateOneIncomingMessageBatchTransactionArgs): Promise<IncomingMessageBatchTransaction | null> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).incomingMessageBatchTransaction.update({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }
}
