import * as TypeGraphQL from "type-graphql";
import type { GraphQLResolveInfo } from "graphql";
import { FindFirstBlockResultOrThrowArgs } from "./args/FindFirstBlockResultOrThrowArgs";
import { BlockResult } from "../../../models/BlockResult";
import { transformInfoIntoPrismaArgs, getPrismaFromContext, transformCountFieldIntoSelectRelationsCount } from "../../../helpers";

@TypeGraphQL.Resolver(_of => BlockResult)
export class FindFirstBlockResultOrThrowResolver {
  @TypeGraphQL.Query(_returns => BlockResult, {
    nullable: true
  })
  async findFirstBlockResultOrThrow(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: FindFirstBlockResultOrThrowArgs): Promise<BlockResult | null> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).blockResult.findFirstOrThrow({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }
}
