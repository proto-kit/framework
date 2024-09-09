import * as TypeGraphQL from "type-graphql";
import type { GraphQLResolveInfo } from "graphql";
import { AggregateIncomingMessageBatchTransactionArgs } from "./args/AggregateIncomingMessageBatchTransactionArgs";
import { CreateManyAndReturnIncomingMessageBatchTransactionArgs } from "./args/CreateManyAndReturnIncomingMessageBatchTransactionArgs";
import { CreateManyIncomingMessageBatchTransactionArgs } from "./args/CreateManyIncomingMessageBatchTransactionArgs";
import { CreateOneIncomingMessageBatchTransactionArgs } from "./args/CreateOneIncomingMessageBatchTransactionArgs";
import { DeleteManyIncomingMessageBatchTransactionArgs } from "./args/DeleteManyIncomingMessageBatchTransactionArgs";
import { DeleteOneIncomingMessageBatchTransactionArgs } from "./args/DeleteOneIncomingMessageBatchTransactionArgs";
import { FindFirstIncomingMessageBatchTransactionArgs } from "./args/FindFirstIncomingMessageBatchTransactionArgs";
import { FindFirstIncomingMessageBatchTransactionOrThrowArgs } from "./args/FindFirstIncomingMessageBatchTransactionOrThrowArgs";
import { FindManyIncomingMessageBatchTransactionArgs } from "./args/FindManyIncomingMessageBatchTransactionArgs";
import { FindUniqueIncomingMessageBatchTransactionArgs } from "./args/FindUniqueIncomingMessageBatchTransactionArgs";
import { FindUniqueIncomingMessageBatchTransactionOrThrowArgs } from "./args/FindUniqueIncomingMessageBatchTransactionOrThrowArgs";
import { GroupByIncomingMessageBatchTransactionArgs } from "./args/GroupByIncomingMessageBatchTransactionArgs";
import { UpdateManyIncomingMessageBatchTransactionArgs } from "./args/UpdateManyIncomingMessageBatchTransactionArgs";
import { UpdateOneIncomingMessageBatchTransactionArgs } from "./args/UpdateOneIncomingMessageBatchTransactionArgs";
import { UpsertOneIncomingMessageBatchTransactionArgs } from "./args/UpsertOneIncomingMessageBatchTransactionArgs";
import { transformInfoIntoPrismaArgs, getPrismaFromContext, transformCountFieldIntoSelectRelationsCount } from "../../../helpers";
import { IncomingMessageBatchTransaction } from "../../../models/IncomingMessageBatchTransaction";
import { AffectedRowsOutput } from "../../outputs/AffectedRowsOutput";
import { AggregateIncomingMessageBatchTransaction } from "../../outputs/AggregateIncomingMessageBatchTransaction";
import { CreateManyAndReturnIncomingMessageBatchTransaction } from "../../outputs/CreateManyAndReturnIncomingMessageBatchTransaction";
import { IncomingMessageBatchTransactionGroupBy } from "../../outputs/IncomingMessageBatchTransactionGroupBy";

@TypeGraphQL.Resolver(_of => IncomingMessageBatchTransaction)
export class IncomingMessageBatchTransactionCrudResolver {
  @TypeGraphQL.Query(_returns => AggregateIncomingMessageBatchTransaction, {
    nullable: false
  })
  async aggregateIncomingMessageBatchTransaction(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: AggregateIncomingMessageBatchTransactionArgs): Promise<AggregateIncomingMessageBatchTransaction> {
    return getPrismaFromContext(ctx).incomingMessageBatchTransaction.aggregate({
      ...args,
      ...transformInfoIntoPrismaArgs(info),
    });
  }

  @TypeGraphQL.Mutation(_returns => AffectedRowsOutput, {
    nullable: false
  })
  async createManyIncomingMessageBatchTransaction(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: CreateManyIncomingMessageBatchTransactionArgs): Promise<AffectedRowsOutput> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).incomingMessageBatchTransaction.createMany({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }

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

  @TypeGraphQL.Mutation(_returns => IncomingMessageBatchTransaction, {
    nullable: false
  })
  async createOneIncomingMessageBatchTransaction(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: CreateOneIncomingMessageBatchTransactionArgs): Promise<IncomingMessageBatchTransaction> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).incomingMessageBatchTransaction.create({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }

  @TypeGraphQL.Mutation(_returns => AffectedRowsOutput, {
    nullable: false
  })
  async deleteManyIncomingMessageBatchTransaction(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: DeleteManyIncomingMessageBatchTransactionArgs): Promise<AffectedRowsOutput> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).incomingMessageBatchTransaction.deleteMany({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }

  @TypeGraphQL.Mutation(_returns => IncomingMessageBatchTransaction, {
    nullable: true
  })
  async deleteOneIncomingMessageBatchTransaction(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: DeleteOneIncomingMessageBatchTransactionArgs): Promise<IncomingMessageBatchTransaction | null> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).incomingMessageBatchTransaction.delete({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }

  @TypeGraphQL.Query(_returns => IncomingMessageBatchTransaction, {
    nullable: true
  })
  async findFirstIncomingMessageBatchTransaction(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: FindFirstIncomingMessageBatchTransactionArgs): Promise<IncomingMessageBatchTransaction | null> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).incomingMessageBatchTransaction.findFirst({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }

  @TypeGraphQL.Query(_returns => IncomingMessageBatchTransaction, {
    nullable: true
  })
  async findFirstIncomingMessageBatchTransactionOrThrow(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: FindFirstIncomingMessageBatchTransactionOrThrowArgs): Promise<IncomingMessageBatchTransaction | null> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).incomingMessageBatchTransaction.findFirstOrThrow({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }

  @TypeGraphQL.Query(_returns => [IncomingMessageBatchTransaction], {
    nullable: false
  })
  async incomingMessageBatchTransactions(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: FindManyIncomingMessageBatchTransactionArgs): Promise<IncomingMessageBatchTransaction[]> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).incomingMessageBatchTransaction.findMany({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }

  @TypeGraphQL.Query(_returns => IncomingMessageBatchTransaction, {
    nullable: true
  })
  async incomingMessageBatchTransaction(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: FindUniqueIncomingMessageBatchTransactionArgs): Promise<IncomingMessageBatchTransaction | null> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).incomingMessageBatchTransaction.findUnique({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }

  @TypeGraphQL.Query(_returns => IncomingMessageBatchTransaction, {
    nullable: true
  })
  async getIncomingMessageBatchTransaction(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: FindUniqueIncomingMessageBatchTransactionOrThrowArgs): Promise<IncomingMessageBatchTransaction | null> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).incomingMessageBatchTransaction.findUniqueOrThrow({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }

  @TypeGraphQL.Query(_returns => [IncomingMessageBatchTransactionGroupBy], {
    nullable: false
  })
  async groupByIncomingMessageBatchTransaction(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: GroupByIncomingMessageBatchTransactionArgs): Promise<IncomingMessageBatchTransactionGroupBy[]> {
    const { _count, _avg, _sum, _min, _max } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).incomingMessageBatchTransaction.groupBy({
      ...args,
      ...Object.fromEntries(
        Object.entries({ _count, _avg, _sum, _min, _max }).filter(([_, v]) => v != null)
      ),
    });
  }

  @TypeGraphQL.Mutation(_returns => AffectedRowsOutput, {
    nullable: false
  })
  async updateManyIncomingMessageBatchTransaction(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: UpdateManyIncomingMessageBatchTransactionArgs): Promise<AffectedRowsOutput> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).incomingMessageBatchTransaction.updateMany({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }

  @TypeGraphQL.Mutation(_returns => IncomingMessageBatchTransaction, {
    nullable: true
  })
  async updateOneIncomingMessageBatchTransaction(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: UpdateOneIncomingMessageBatchTransactionArgs): Promise<IncomingMessageBatchTransaction | null> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).incomingMessageBatchTransaction.update({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }

  @TypeGraphQL.Mutation(_returns => IncomingMessageBatchTransaction, {
    nullable: false
  })
  async upsertOneIncomingMessageBatchTransaction(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: UpsertOneIncomingMessageBatchTransactionArgs): Promise<IncomingMessageBatchTransaction> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).incomingMessageBatchTransaction.upsert({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }
}
