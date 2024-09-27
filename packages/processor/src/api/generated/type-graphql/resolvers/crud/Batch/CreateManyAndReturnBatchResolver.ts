import * as TypeGraphQL from "type-graphql";
import type { GraphQLResolveInfo } from "graphql";
import { CreateManyAndReturnBatchArgs } from "./args/CreateManyAndReturnBatchArgs";
import { Batch } from "../../../models/Batch";
import { CreateManyAndReturnBatch } from "../../outputs/CreateManyAndReturnBatch";
import { transformInfoIntoPrismaArgs, getPrismaFromContext, transformCountFieldIntoSelectRelationsCount } from "../../../helpers";

@TypeGraphQL.Resolver(_of => Batch)
export class CreateManyAndReturnBatchResolver {
  @TypeGraphQL.Mutation(_returns => [CreateManyAndReturnBatch], {
    nullable: false
  })
  async createManyAndReturnBatch(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: CreateManyAndReturnBatchArgs): Promise<CreateManyAndReturnBatch[]> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).batch.createManyAndReturn({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }
}
