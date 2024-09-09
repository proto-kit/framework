import * as TypeGraphQL from "type-graphql";
import type { GraphQLResolveInfo } from "graphql";
import { UpsertOneIncomingMessageBatchArgs } from "./args/UpsertOneIncomingMessageBatchArgs";
import { IncomingMessageBatch } from "../../../models/IncomingMessageBatch";
import { transformInfoIntoPrismaArgs, getPrismaFromContext, transformCountFieldIntoSelectRelationsCount } from "../../../helpers";

@TypeGraphQL.Resolver(_of => IncomingMessageBatch)
export class UpsertOneIncomingMessageBatchResolver {
  @TypeGraphQL.Mutation(_returns => IncomingMessageBatch, {
    nullable: false
  })
  async upsertOneIncomingMessageBatch(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: UpsertOneIncomingMessageBatchArgs): Promise<IncomingMessageBatch> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).incomingMessageBatch.upsert({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }
}
