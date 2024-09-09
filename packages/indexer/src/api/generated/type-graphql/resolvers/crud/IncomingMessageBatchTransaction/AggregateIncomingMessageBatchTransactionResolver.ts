import * as TypeGraphQL from "type-graphql";
import type { GraphQLResolveInfo } from "graphql";
import { AggregateIncomingMessageBatchTransactionArgs } from "./args/AggregateIncomingMessageBatchTransactionArgs";
import { IncomingMessageBatchTransaction } from "../../../models/IncomingMessageBatchTransaction";
import { AggregateIncomingMessageBatchTransaction } from "../../outputs/AggregateIncomingMessageBatchTransaction";
import { transformInfoIntoPrismaArgs, getPrismaFromContext, transformCountFieldIntoSelectRelationsCount } from "../../../helpers";

@TypeGraphQL.Resolver(_of => IncomingMessageBatchTransaction)
export class AggregateIncomingMessageBatchTransactionResolver {
  @TypeGraphQL.Query(_returns => AggregateIncomingMessageBatchTransaction, {
    nullable: false
  })
  async aggregateIncomingMessageBatchTransaction(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: AggregateIncomingMessageBatchTransactionArgs): Promise<AggregateIncomingMessageBatchTransaction> {
    return getPrismaFromContext(ctx).incomingMessageBatchTransaction.aggregate({
      ...args,
      ...transformInfoIntoPrismaArgs(info),
    });
  }
}
