import * as TypeGraphQL from "type-graphql";
import type { GraphQLResolveInfo } from "graphql";
import { CreateOneIncomingMessageBatchTransactionArgs } from "./args/CreateOneIncomingMessageBatchTransactionArgs";
import { IncomingMessageBatchTransaction } from "../../../models/IncomingMessageBatchTransaction";
import { transformInfoIntoPrismaArgs, getPrismaFromContext, transformCountFieldIntoSelectRelationsCount } from "../../../helpers";

@TypeGraphQL.Resolver(_of => IncomingMessageBatchTransaction)
export class CreateOneIncomingMessageBatchTransactionResolver {
  @TypeGraphQL.Mutation(_returns => IncomingMessageBatchTransaction, {
    nullable: false
  })
  async createOneIncomingMessageBatchTransaction(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: CreateOneIncomingMessageBatchTransactionArgs): Promise<IncomingMessageBatchTransaction> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).incomingMessageBatchTransaction.create({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }
}
