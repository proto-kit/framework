import * as TypeGraphQL from "type-graphql";
import type { GraphQLResolveInfo } from "graphql";
import { DeleteOneBlockResultArgs } from "./args/DeleteOneBlockResultArgs";
import { BlockResult } from "../../../models/BlockResult";
import { transformInfoIntoPrismaArgs, getPrismaFromContext, transformCountFieldIntoSelectRelationsCount } from "../../../helpers";

@TypeGraphQL.Resolver(_of => BlockResult)
export class DeleteOneBlockResultResolver {
  @TypeGraphQL.Mutation(_returns => BlockResult, {
    nullable: true
  })
  async deleteOneBlockResult(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: DeleteOneBlockResultArgs): Promise<BlockResult | null> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).blockResult.delete({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }
}
