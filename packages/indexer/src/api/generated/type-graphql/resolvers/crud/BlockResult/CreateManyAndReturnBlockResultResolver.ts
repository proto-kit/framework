import * as TypeGraphQL from "type-graphql";
import type { GraphQLResolveInfo } from "graphql";
import { CreateManyAndReturnBlockResultArgs } from "./args/CreateManyAndReturnBlockResultArgs";
import { BlockResult } from "../../../models/BlockResult";
import { CreateManyAndReturnBlockResult } from "../../outputs/CreateManyAndReturnBlockResult";
import { transformInfoIntoPrismaArgs, getPrismaFromContext, transformCountFieldIntoSelectRelationsCount } from "../../../helpers";

@TypeGraphQL.Resolver(_of => BlockResult)
export class CreateManyAndReturnBlockResultResolver {
  @TypeGraphQL.Mutation(_returns => [CreateManyAndReturnBlockResult], {
    nullable: false
  })
  async createManyAndReturnBlockResult(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: CreateManyAndReturnBlockResultArgs): Promise<CreateManyAndReturnBlockResult[]> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).blockResult.createManyAndReturn({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }
}
