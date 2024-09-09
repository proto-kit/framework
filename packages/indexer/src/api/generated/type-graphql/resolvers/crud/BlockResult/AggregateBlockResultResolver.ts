import * as TypeGraphQL from "type-graphql";
import type { GraphQLResolveInfo } from "graphql";
import { AggregateBlockResultArgs } from "./args/AggregateBlockResultArgs";
import { BlockResult } from "../../../models/BlockResult";
import { AggregateBlockResult } from "../../outputs/AggregateBlockResult";
import { transformInfoIntoPrismaArgs, getPrismaFromContext, transformCountFieldIntoSelectRelationsCount } from "../../../helpers";

@TypeGraphQL.Resolver(_of => BlockResult)
export class AggregateBlockResultResolver {
  @TypeGraphQL.Query(_returns => AggregateBlockResult, {
    nullable: false
  })
  async aggregateBlockResult(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: AggregateBlockResultArgs): Promise<AggregateBlockResult> {
    return getPrismaFromContext(ctx).blockResult.aggregate({
      ...args,
      ...transformInfoIntoPrismaArgs(info),
    });
  }
}
