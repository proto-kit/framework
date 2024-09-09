import * as TypeGraphQL from "type-graphql";
import type { GraphQLResolveInfo } from "graphql";
import { FindUniqueBlockResultArgs } from "./args/FindUniqueBlockResultArgs";
import { BlockResult } from "../../../models/BlockResult";
import { transformInfoIntoPrismaArgs, getPrismaFromContext, transformCountFieldIntoSelectRelationsCount } from "../../../helpers";

@TypeGraphQL.Resolver(_of => BlockResult)
export class FindUniqueBlockResultResolver {
  @TypeGraphQL.Query(_returns => BlockResult, {
    nullable: true
  })
  async blockResult(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: FindUniqueBlockResultArgs): Promise<BlockResult | null> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).blockResult.findUnique({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }
}
