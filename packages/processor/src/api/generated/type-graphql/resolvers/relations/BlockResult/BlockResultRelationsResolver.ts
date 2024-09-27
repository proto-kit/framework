import * as TypeGraphQL from "type-graphql";
import type { GraphQLResolveInfo } from "graphql";
import { Block } from "../../../models/Block";
import { BlockResult } from "../../../models/BlockResult";
import { BlockResultBlockArgs } from "./args/BlockResultBlockArgs";
import { transformInfoIntoPrismaArgs, getPrismaFromContext, transformCountFieldIntoSelectRelationsCount } from "../../../helpers";

@TypeGraphQL.Resolver(_of => BlockResult)
export class BlockResultRelationsResolver {
  @TypeGraphQL.FieldResolver(_type => Block, {
    nullable: true
  })
  async block(@TypeGraphQL.Root() blockResult: BlockResult, @TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: BlockResultBlockArgs): Promise<Block | null> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).blockResult.findUniqueOrThrow({
      where: {
        blockHash: blockResult.blockHash,
      },
    }).block({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }
}
