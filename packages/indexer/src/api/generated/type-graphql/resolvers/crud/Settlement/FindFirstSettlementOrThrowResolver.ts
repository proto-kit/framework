import * as TypeGraphQL from "type-graphql";
import type { GraphQLResolveInfo } from "graphql";
import { FindFirstSettlementOrThrowArgs } from "./args/FindFirstSettlementOrThrowArgs";
import { Settlement } from "../../../models/Settlement";
import { transformInfoIntoPrismaArgs, getPrismaFromContext, transformCountFieldIntoSelectRelationsCount } from "../../../helpers";

@TypeGraphQL.Resolver(_of => Settlement)
export class FindFirstSettlementOrThrowResolver {
  @TypeGraphQL.Query(_returns => Settlement, {
    nullable: true
  })
  async findFirstSettlementOrThrow(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: FindFirstSettlementOrThrowArgs): Promise<Settlement | null> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).settlement.findFirstOrThrow({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }
}
