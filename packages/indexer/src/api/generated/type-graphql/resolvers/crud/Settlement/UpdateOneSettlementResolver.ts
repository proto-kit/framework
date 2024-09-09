import * as TypeGraphQL from "type-graphql";
import type { GraphQLResolveInfo } from "graphql";
import { UpdateOneSettlementArgs } from "./args/UpdateOneSettlementArgs";
import { Settlement } from "../../../models/Settlement";
import { transformInfoIntoPrismaArgs, getPrismaFromContext, transformCountFieldIntoSelectRelationsCount } from "../../../helpers";

@TypeGraphQL.Resolver(_of => Settlement)
export class UpdateOneSettlementResolver {
  @TypeGraphQL.Mutation(_returns => Settlement, {
    nullable: true
  })
  async updateOneSettlement(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: UpdateOneSettlementArgs): Promise<Settlement | null> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).settlement.update({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }
}
