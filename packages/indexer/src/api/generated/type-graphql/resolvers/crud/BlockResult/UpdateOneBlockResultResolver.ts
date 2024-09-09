import * as TypeGraphQL from "type-graphql";
import type { GraphQLResolveInfo } from "graphql";
import { UpdateOneBlockResultArgs } from "./args/UpdateOneBlockResultArgs";
import { BlockResult } from "../../../models/BlockResult";
import { transformInfoIntoPrismaArgs, getPrismaFromContext, transformCountFieldIntoSelectRelationsCount } from "../../../helpers";

@TypeGraphQL.Resolver(_of => BlockResult)
export class UpdateOneBlockResultResolver {
  @TypeGraphQL.Mutation(_returns => BlockResult, {
    nullable: true
  })
  async updateOneBlockResult(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: UpdateOneBlockResultArgs): Promise<BlockResult | null> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).blockResult.update({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }
}
