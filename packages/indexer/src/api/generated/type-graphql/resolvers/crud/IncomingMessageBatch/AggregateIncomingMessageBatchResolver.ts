import * as TypeGraphQL from "type-graphql";
import type { GraphQLResolveInfo } from "graphql";
import { AggregateIncomingMessageBatchArgs } from "./args/AggregateIncomingMessageBatchArgs";
import { IncomingMessageBatch } from "../../../models/IncomingMessageBatch";
import { AggregateIncomingMessageBatch } from "../../outputs/AggregateIncomingMessageBatch";
import { transformInfoIntoPrismaArgs, getPrismaFromContext, transformCountFieldIntoSelectRelationsCount } from "../../../helpers";

@TypeGraphQL.Resolver(_of => IncomingMessageBatch)
export class AggregateIncomingMessageBatchResolver {
  @TypeGraphQL.Query(_returns => AggregateIncomingMessageBatch, {
    nullable: false
  })
  async aggregateIncomingMessageBatch(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: AggregateIncomingMessageBatchArgs): Promise<AggregateIncomingMessageBatch> {
    return getPrismaFromContext(ctx).incomingMessageBatch.aggregate({
      ...args,
      ...transformInfoIntoPrismaArgs(info),
    });
  }
}
