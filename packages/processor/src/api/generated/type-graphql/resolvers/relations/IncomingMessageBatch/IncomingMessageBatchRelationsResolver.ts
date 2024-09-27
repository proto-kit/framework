import * as TypeGraphQL from "type-graphql";
import type { GraphQLResolveInfo } from "graphql";
import { IncomingMessageBatch } from "../../../models/IncomingMessageBatch";
import { IncomingMessageBatchTransaction } from "../../../models/IncomingMessageBatchTransaction";
import { IncomingMessageBatchMessagesArgs } from "./args/IncomingMessageBatchMessagesArgs";
import { transformInfoIntoPrismaArgs, getPrismaFromContext, transformCountFieldIntoSelectRelationsCount } from "../../../helpers";

@TypeGraphQL.Resolver(_of => IncomingMessageBatch)
export class IncomingMessageBatchRelationsResolver {
  @TypeGraphQL.FieldResolver(_type => [IncomingMessageBatchTransaction], {
    nullable: false
  })
  async messages(@TypeGraphQL.Root() incomingMessageBatch: IncomingMessageBatch, @TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: IncomingMessageBatchMessagesArgs): Promise<IncomingMessageBatchTransaction[]> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).incomingMessageBatch.findUniqueOrThrow({
      where: {
        id: incomingMessageBatch.id,
      },
    }).messages({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }
}
