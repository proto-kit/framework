import * as TypeGraphQL from "type-graphql";
import type { GraphQLResolveInfo } from "graphql";
import { GroupByBlockResultArgs } from "./args/GroupByBlockResultArgs";
import { BlockResult } from "../../../models/BlockResult";
import { BlockResultGroupBy } from "../../outputs/BlockResultGroupBy";
import { transformInfoIntoPrismaArgs, getPrismaFromContext, transformCountFieldIntoSelectRelationsCount } from "../../../helpers";

@TypeGraphQL.Resolver(_of => BlockResult)
export class GroupByBlockResultResolver {
  @TypeGraphQL.Query(_returns => [BlockResultGroupBy], {
    nullable: false
  })
  async groupByBlockResult(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: GroupByBlockResultArgs): Promise<BlockResultGroupBy[]> {
    const { _count, _avg, _sum, _min, _max } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).blockResult.groupBy({
      ...args,
      ...Object.fromEntries(
        Object.entries({ _count, _avg, _sum, _min, _max }).filter(([_, v]) => v != null)
      ),
    });
  }
}
