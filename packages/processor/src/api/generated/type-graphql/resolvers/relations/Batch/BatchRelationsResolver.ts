import * as TypeGraphQL from "type-graphql";
import type { GraphQLResolveInfo } from "graphql";
import { Batch } from "../../../models/Batch";
import { Block } from "../../../models/Block";
import { Settlement } from "../../../models/Settlement";
import { BatchBlocksArgs } from "./args/BatchBlocksArgs";
import { BatchSettlementArgs } from "./args/BatchSettlementArgs";
import { transformInfoIntoPrismaArgs, getPrismaFromContext, transformCountFieldIntoSelectRelationsCount } from "../../../helpers";

@TypeGraphQL.Resolver(_of => Batch)
export class BatchRelationsResolver {
  @TypeGraphQL.FieldResolver(_type => [Block], {
    nullable: false
  })
  async blocks(@TypeGraphQL.Root() batch: Batch, @TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: BatchBlocksArgs): Promise<Block[]> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).batch.findUniqueOrThrow({
      where: {
        height: batch.height,
      },
    }).blocks({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }

  @TypeGraphQL.FieldResolver(_type => Settlement, {
    nullable: true
  })
  async settlement(@TypeGraphQL.Root() batch: Batch, @TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: BatchSettlementArgs): Promise<Settlement | null> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).batch.findUniqueOrThrow({
      where: {
        height: batch.height,
      },
    }).settlement({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }
}
