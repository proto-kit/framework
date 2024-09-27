import * as TypeGraphQL from "type-graphql";
import type { GraphQLResolveInfo } from "graphql";
import { CreateManyAndReturnTransactionArgs } from "./args/CreateManyAndReturnTransactionArgs";
import { Transaction } from "../../../models/Transaction";
import { CreateManyAndReturnTransaction } from "../../outputs/CreateManyAndReturnTransaction";
import { transformInfoIntoPrismaArgs, getPrismaFromContext, transformCountFieldIntoSelectRelationsCount } from "../../../helpers";

@TypeGraphQL.Resolver(_of => Transaction)
export class CreateManyAndReturnTransactionResolver {
  @TypeGraphQL.Mutation(_returns => [CreateManyAndReturnTransaction], {
    nullable: false
  })
  async createManyAndReturnTransaction(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: CreateManyAndReturnTransactionArgs): Promise<CreateManyAndReturnTransaction[]> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).transaction.createManyAndReturn({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }
}
