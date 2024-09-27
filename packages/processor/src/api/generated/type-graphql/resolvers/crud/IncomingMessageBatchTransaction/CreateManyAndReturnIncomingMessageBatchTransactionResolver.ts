import * as TypeGraphQL from "type-graphql";
import type { GraphQLResolveInfo } from "graphql";
import { CreateManyAndReturnIncomingMessageBatchTransactionArgs } from "./args/CreateManyAndReturnIncomingMessageBatchTransactionArgs";
import { IncomingMessageBatchTransaction } from "../../../models/IncomingMessageBatchTransaction";
import { CreateManyAndReturnIncomingMessageBatchTransaction } from "../../outputs/CreateManyAndReturnIncomingMessageBatchTransaction";
import { transformInfoIntoPrismaArgs, getPrismaFromContext, transformCountFieldIntoSelectRelationsCount } from "../../../helpers";

@TypeGraphQL.Resolver(_of => IncomingMessageBatchTransaction)
export class CreateManyAndReturnIncomingMessageBatchTransactionResolver {
  @TypeGraphQL.Mutation(_returns => [CreateManyAndReturnIncomingMessageBatchTransaction], {
    nullable: false
  })
  async createManyAndReturnIncomingMessageBatchTransaction(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: CreateManyAndReturnIncomingMessageBatchTransactionArgs): Promise<CreateManyAndReturnIncomingMessageBatchTransaction[]> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).incomingMessageBatchTransaction.createManyAndReturn({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }
}
