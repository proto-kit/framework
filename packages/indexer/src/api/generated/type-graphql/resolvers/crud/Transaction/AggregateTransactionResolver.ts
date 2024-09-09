import * as TypeGraphQL from "type-graphql";
import type { GraphQLResolveInfo } from "graphql";
import { AggregateTransactionArgs } from "./args/AggregateTransactionArgs";
import { Transaction } from "../../../models/Transaction";
import { AggregateTransaction } from "../../outputs/AggregateTransaction";
import { transformInfoIntoPrismaArgs, getPrismaFromContext, transformCountFieldIntoSelectRelationsCount } from "../../../helpers";

@TypeGraphQL.Resolver(_of => Transaction)
export class AggregateTransactionResolver {
  @TypeGraphQL.Query(_returns => AggregateTransaction, {
    nullable: false
  })
  async aggregateTransaction(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: AggregateTransactionArgs): Promise<AggregateTransaction> {
    return getPrismaFromContext(ctx).transaction.aggregate({
      ...args,
      ...transformInfoIntoPrismaArgs(info),
    });
  }
}
