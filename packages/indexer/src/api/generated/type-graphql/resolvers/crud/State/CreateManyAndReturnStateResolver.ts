import * as TypeGraphQL from "type-graphql";
import type { GraphQLResolveInfo } from "graphql";
import { CreateManyAndReturnStateArgs } from "./args/CreateManyAndReturnStateArgs";
import { State } from "../../../models/State";
import { CreateManyAndReturnState } from "../../outputs/CreateManyAndReturnState";
import { transformInfoIntoPrismaArgs, getPrismaFromContext, transformCountFieldIntoSelectRelationsCount } from "../../../helpers";

@TypeGraphQL.Resolver(_of => State)
export class CreateManyAndReturnStateResolver {
  @TypeGraphQL.Mutation(_returns => [CreateManyAndReturnState], {
    nullable: false
  })
  async createManyAndReturnState(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: CreateManyAndReturnStateArgs): Promise<CreateManyAndReturnState[]> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).state.createManyAndReturn({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }
}
