import * as TypeGraphQL from "type-graphql";
import type { GraphQLResolveInfo } from "graphql";
import { AggregateBatchArgs } from "./args/AggregateBatchArgs";
import { Batch } from "../../../models/Batch";
import { AggregateBatch } from "../../outputs/AggregateBatch";
import { transformInfoIntoPrismaArgs, getPrismaFromContext, transformCountFieldIntoSelectRelationsCount } from "../../../helpers";

@TypeGraphQL.Resolver(_of => Batch)
export class AggregateBatchResolver {
  @TypeGraphQL.Query(_returns => AggregateBatch, {
    nullable: false
  })
  async aggregateBatch(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: AggregateBatchArgs): Promise<AggregateBatch> {
    return getPrismaFromContext(ctx).batch.aggregate({
      ...args,
      ...transformInfoIntoPrismaArgs(info),
    });
  }
}
