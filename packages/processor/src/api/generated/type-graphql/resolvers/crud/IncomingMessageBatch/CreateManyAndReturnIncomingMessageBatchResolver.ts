import * as TypeGraphQL from "type-graphql";
import type { GraphQLResolveInfo } from "graphql";
import { CreateManyAndReturnIncomingMessageBatchArgs } from "./args/CreateManyAndReturnIncomingMessageBatchArgs";
import { IncomingMessageBatch } from "../../../models/IncomingMessageBatch";
import { CreateManyAndReturnIncomingMessageBatch } from "../../outputs/CreateManyAndReturnIncomingMessageBatch";
import { transformInfoIntoPrismaArgs, getPrismaFromContext, transformCountFieldIntoSelectRelationsCount } from "../../../helpers";

@TypeGraphQL.Resolver(_of => IncomingMessageBatch)
export class CreateManyAndReturnIncomingMessageBatchResolver {
  @TypeGraphQL.Mutation(_returns => [CreateManyAndReturnIncomingMessageBatch], {
    nullable: false
  })
  async createManyAndReturnIncomingMessageBatch(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: CreateManyAndReturnIncomingMessageBatchArgs): Promise<CreateManyAndReturnIncomingMessageBatch[]> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).incomingMessageBatch.createManyAndReturn({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }
}
