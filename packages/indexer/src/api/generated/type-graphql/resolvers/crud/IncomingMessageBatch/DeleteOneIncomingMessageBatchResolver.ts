import * as TypeGraphQL from "type-graphql";
import type { GraphQLResolveInfo } from "graphql";
import { DeleteOneIncomingMessageBatchArgs } from "./args/DeleteOneIncomingMessageBatchArgs";
import { IncomingMessageBatch } from "../../../models/IncomingMessageBatch";
import { transformInfoIntoPrismaArgs, getPrismaFromContext, transformCountFieldIntoSelectRelationsCount } from "../../../helpers";

@TypeGraphQL.Resolver(_of => IncomingMessageBatch)
export class DeleteOneIncomingMessageBatchResolver {
  @TypeGraphQL.Mutation(_returns => IncomingMessageBatch, {
    nullable: true
  })
  async deleteOneIncomingMessageBatch(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: DeleteOneIncomingMessageBatchArgs): Promise<IncomingMessageBatch | null> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).incomingMessageBatch.delete({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }
}
