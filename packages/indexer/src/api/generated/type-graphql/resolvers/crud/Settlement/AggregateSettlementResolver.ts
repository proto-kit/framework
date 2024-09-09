import * as TypeGraphQL from "type-graphql";
import type { GraphQLResolveInfo } from "graphql";
import { AggregateSettlementArgs } from "./args/AggregateSettlementArgs";
import { Settlement } from "../../../models/Settlement";
import { AggregateSettlement } from "../../outputs/AggregateSettlement";
import { transformInfoIntoPrismaArgs, getPrismaFromContext, transformCountFieldIntoSelectRelationsCount } from "../../../helpers";

@TypeGraphQL.Resolver(_of => Settlement)
export class AggregateSettlementResolver {
  @TypeGraphQL.Query(_returns => AggregateSettlement, {
    nullable: false
  })
  async aggregateSettlement(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: AggregateSettlementArgs): Promise<AggregateSettlement> {
    return getPrismaFromContext(ctx).settlement.aggregate({
      ...args,
      ...transformInfoIntoPrismaArgs(info),
    });
  }
}
