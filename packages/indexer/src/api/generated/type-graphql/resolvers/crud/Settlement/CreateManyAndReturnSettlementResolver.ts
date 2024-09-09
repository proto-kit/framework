import * as TypeGraphQL from "type-graphql";
import type { GraphQLResolveInfo } from "graphql";
import { CreateManyAndReturnSettlementArgs } from "./args/CreateManyAndReturnSettlementArgs";
import { Settlement } from "../../../models/Settlement";
import { CreateManyAndReturnSettlement } from "../../outputs/CreateManyAndReturnSettlement";
import { transformInfoIntoPrismaArgs, getPrismaFromContext, transformCountFieldIntoSelectRelationsCount } from "../../../helpers";

@TypeGraphQL.Resolver(_of => Settlement)
export class CreateManyAndReturnSettlementResolver {
  @TypeGraphQL.Mutation(_returns => [CreateManyAndReturnSettlement], {
    nullable: false
  })
  async createManyAndReturnSettlement(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: CreateManyAndReturnSettlementArgs): Promise<CreateManyAndReturnSettlement[]> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).settlement.createManyAndReturn({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }
}
