import * as TypeGraphQL from "type-graphql";
import type { GraphQLResolveInfo } from "graphql";
import { AggregateTransactionExecutionResultArgs } from "./args/AggregateTransactionExecutionResultArgs";
import { CreateManyAndReturnTransactionExecutionResultArgs } from "./args/CreateManyAndReturnTransactionExecutionResultArgs";
import { CreateManyTransactionExecutionResultArgs } from "./args/CreateManyTransactionExecutionResultArgs";
import { CreateOneTransactionExecutionResultArgs } from "./args/CreateOneTransactionExecutionResultArgs";
import { DeleteManyTransactionExecutionResultArgs } from "./args/DeleteManyTransactionExecutionResultArgs";
import { DeleteOneTransactionExecutionResultArgs } from "./args/DeleteOneTransactionExecutionResultArgs";
import { FindFirstTransactionExecutionResultArgs } from "./args/FindFirstTransactionExecutionResultArgs";
import { FindFirstTransactionExecutionResultOrThrowArgs } from "./args/FindFirstTransactionExecutionResultOrThrowArgs";
import { FindManyTransactionExecutionResultArgs } from "./args/FindManyTransactionExecutionResultArgs";
import { FindUniqueTransactionExecutionResultArgs } from "./args/FindUniqueTransactionExecutionResultArgs";
import { FindUniqueTransactionExecutionResultOrThrowArgs } from "./args/FindUniqueTransactionExecutionResultOrThrowArgs";
import { GroupByTransactionExecutionResultArgs } from "./args/GroupByTransactionExecutionResultArgs";
import { UpdateManyTransactionExecutionResultArgs } from "./args/UpdateManyTransactionExecutionResultArgs";
import { UpdateOneTransactionExecutionResultArgs } from "./args/UpdateOneTransactionExecutionResultArgs";
import { UpsertOneTransactionExecutionResultArgs } from "./args/UpsertOneTransactionExecutionResultArgs";
import { transformInfoIntoPrismaArgs, getPrismaFromContext, transformCountFieldIntoSelectRelationsCount } from "../../../helpers";
import { TransactionExecutionResult } from "../../../models/TransactionExecutionResult";
import { AffectedRowsOutput } from "../../outputs/AffectedRowsOutput";
import { AggregateTransactionExecutionResult } from "../../outputs/AggregateTransactionExecutionResult";
import { CreateManyAndReturnTransactionExecutionResult } from "../../outputs/CreateManyAndReturnTransactionExecutionResult";
import { TransactionExecutionResultGroupBy } from "../../outputs/TransactionExecutionResultGroupBy";

@TypeGraphQL.Resolver(_of => TransactionExecutionResult)
export class TransactionExecutionResultCrudResolver {
  @TypeGraphQL.Query(_returns => AggregateTransactionExecutionResult, {
    nullable: false
  })
  async aggregateTransactionExecutionResult(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: AggregateTransactionExecutionResultArgs): Promise<AggregateTransactionExecutionResult> {
    return getPrismaFromContext(ctx).transactionExecutionResult.aggregate({
      ...args,
      ...transformInfoIntoPrismaArgs(info),
    });
  }

  @TypeGraphQL.Mutation(_returns => AffectedRowsOutput, {
    nullable: false
  })
  async createManyTransactionExecutionResult(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: CreateManyTransactionExecutionResultArgs): Promise<AffectedRowsOutput> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).transactionExecutionResult.createMany({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }

  @TypeGraphQL.Mutation(_returns => [CreateManyAndReturnTransactionExecutionResult], {
    nullable: false
  })
  async createManyAndReturnTransactionExecutionResult(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: CreateManyAndReturnTransactionExecutionResultArgs): Promise<CreateManyAndReturnTransactionExecutionResult[]> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).transactionExecutionResult.createManyAndReturn({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }

  @TypeGraphQL.Mutation(_returns => TransactionExecutionResult, {
    nullable: false
  })
  async createOneTransactionExecutionResult(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: CreateOneTransactionExecutionResultArgs): Promise<TransactionExecutionResult> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).transactionExecutionResult.create({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }

  @TypeGraphQL.Mutation(_returns => AffectedRowsOutput, {
    nullable: false
  })
  async deleteManyTransactionExecutionResult(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: DeleteManyTransactionExecutionResultArgs): Promise<AffectedRowsOutput> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).transactionExecutionResult.deleteMany({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }

  @TypeGraphQL.Mutation(_returns => TransactionExecutionResult, {
    nullable: true
  })
  async deleteOneTransactionExecutionResult(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: DeleteOneTransactionExecutionResultArgs): Promise<TransactionExecutionResult | null> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).transactionExecutionResult.delete({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }

  @TypeGraphQL.Query(_returns => TransactionExecutionResult, {
    nullable: true
  })
  async findFirstTransactionExecutionResult(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: FindFirstTransactionExecutionResultArgs): Promise<TransactionExecutionResult | null> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).transactionExecutionResult.findFirst({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }

  @TypeGraphQL.Query(_returns => TransactionExecutionResult, {
    nullable: true
  })
  async findFirstTransactionExecutionResultOrThrow(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: FindFirstTransactionExecutionResultOrThrowArgs): Promise<TransactionExecutionResult | null> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).transactionExecutionResult.findFirstOrThrow({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }

  @TypeGraphQL.Query(_returns => [TransactionExecutionResult], {
    nullable: false
  })
  async transactionExecutionResults(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: FindManyTransactionExecutionResultArgs): Promise<TransactionExecutionResult[]> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).transactionExecutionResult.findMany({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }

  @TypeGraphQL.Query(_returns => TransactionExecutionResult, {
    nullable: true
  })
  async transactionExecutionResult(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: FindUniqueTransactionExecutionResultArgs): Promise<TransactionExecutionResult | null> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).transactionExecutionResult.findUnique({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }

  @TypeGraphQL.Query(_returns => TransactionExecutionResult, {
    nullable: true
  })
  async getTransactionExecutionResult(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: FindUniqueTransactionExecutionResultOrThrowArgs): Promise<TransactionExecutionResult | null> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).transactionExecutionResult.findUniqueOrThrow({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }

  @TypeGraphQL.Query(_returns => [TransactionExecutionResultGroupBy], {
    nullable: false
  })
  async groupByTransactionExecutionResult(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: GroupByTransactionExecutionResultArgs): Promise<TransactionExecutionResultGroupBy[]> {
    const { _count, _avg, _sum, _min, _max } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).transactionExecutionResult.groupBy({
      ...args,
      ...Object.fromEntries(
        Object.entries({ _count, _avg, _sum, _min, _max }).filter(([_, v]) => v != null)
      ),
    });
  }

  @TypeGraphQL.Mutation(_returns => AffectedRowsOutput, {
    nullable: false
  })
  async updateManyTransactionExecutionResult(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: UpdateManyTransactionExecutionResultArgs): Promise<AffectedRowsOutput> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).transactionExecutionResult.updateMany({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }

  @TypeGraphQL.Mutation(_returns => TransactionExecutionResult, {
    nullable: true
  })
  async updateOneTransactionExecutionResult(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: UpdateOneTransactionExecutionResultArgs): Promise<TransactionExecutionResult | null> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).transactionExecutionResult.update({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }

  @TypeGraphQL.Mutation(_returns => TransactionExecutionResult, {
    nullable: false
  })
  async upsertOneTransactionExecutionResult(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: UpsertOneTransactionExecutionResultArgs): Promise<TransactionExecutionResult> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).transactionExecutionResult.upsert({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }
}
