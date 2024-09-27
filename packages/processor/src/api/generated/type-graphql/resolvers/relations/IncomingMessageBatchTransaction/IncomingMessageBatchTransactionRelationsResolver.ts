import * as TypeGraphQL from "type-graphql";
import type { GraphQLResolveInfo } from "graphql";
import { IncomingMessageBatch } from "../../../models/IncomingMessageBatch";
import { IncomingMessageBatchTransaction } from "../../../models/IncomingMessageBatchTransaction";
import { Transaction } from "../../../models/Transaction";
import { transformInfoIntoPrismaArgs, getPrismaFromContext, transformCountFieldIntoSelectRelationsCount } from "../../../helpers";

@TypeGraphQL.Resolver(_of => IncomingMessageBatchTransaction)
export class IncomingMessageBatchTransactionRelationsResolver {
  @TypeGraphQL.FieldResolver(_type => Transaction, {
    nullable: false
  })
  async transaction(@TypeGraphQL.Root() incomingMessageBatchTransaction: IncomingMessageBatchTransaction, @TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo): Promise<Transaction> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).incomingMessageBatchTransaction.findUniqueOrThrow({
      where: {
        transactionHash_batchId: {
          transactionHash: incomingMessageBatchTransaction.transactionHash,
          batchId: incomingMessageBatchTransaction.batchId,
        },
      },
    }).transaction({
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }

  @TypeGraphQL.FieldResolver(_type => IncomingMessageBatch, {
    nullable: false
  })
  async batch(@TypeGraphQL.Root() incomingMessageBatchTransaction: IncomingMessageBatchTransaction, @TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo): Promise<IncomingMessageBatch> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).incomingMessageBatchTransaction.findUniqueOrThrow({
      where: {
        transactionHash_batchId: {
          transactionHash: incomingMessageBatchTransaction.transactionHash,
          batchId: incomingMessageBatchTransaction.batchId,
        },
      },
    }).batch({
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }
}
