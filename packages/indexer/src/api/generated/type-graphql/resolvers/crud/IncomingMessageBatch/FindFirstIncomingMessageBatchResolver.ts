import * as TypeGraphQL from "type-graphql";
import type { GraphQLResolveInfo } from "graphql";
import { FindFirstIncomingMessageBatchArgs } from "./args/FindFirstIncomingMessageBatchArgs";
import { IncomingMessageBatch } from "../../../models/IncomingMessageBatch";
import { transformInfoIntoPrismaArgs, getPrismaFromContext, transformCountFieldIntoSelectRelationsCount } from "../../../helpers";

@TypeGraphQL.Resolver(_of => IncomingMessageBatch)
export class FindFirstIncomingMessageBatchResolver {
  @TypeGraphQL.Query(_returns => IncomingMessageBatch, {
    nullable: true
  })
  async findFirstIncomingMessageBatch(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: FindFirstIncomingMessageBatchArgs): Promise<IncomingMessageBatch | null> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).incomingMessageBatch.findFirst({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }
}
