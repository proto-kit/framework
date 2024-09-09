import * as TypeGraphQL from "type-graphql";
import type { GraphQLResolveInfo } from "graphql";
import { AggregateIncomingMessageBatchArgs } from "./args/AggregateIncomingMessageBatchArgs";
import { CreateManyAndReturnIncomingMessageBatchArgs } from "./args/CreateManyAndReturnIncomingMessageBatchArgs";
import { CreateManyIncomingMessageBatchArgs } from "./args/CreateManyIncomingMessageBatchArgs";
import { CreateOneIncomingMessageBatchArgs } from "./args/CreateOneIncomingMessageBatchArgs";
import { DeleteManyIncomingMessageBatchArgs } from "./args/DeleteManyIncomingMessageBatchArgs";
import { DeleteOneIncomingMessageBatchArgs } from "./args/DeleteOneIncomingMessageBatchArgs";
import { FindFirstIncomingMessageBatchArgs } from "./args/FindFirstIncomingMessageBatchArgs";
import { FindFirstIncomingMessageBatchOrThrowArgs } from "./args/FindFirstIncomingMessageBatchOrThrowArgs";
import { FindManyIncomingMessageBatchArgs } from "./args/FindManyIncomingMessageBatchArgs";
import { FindUniqueIncomingMessageBatchArgs } from "./args/FindUniqueIncomingMessageBatchArgs";
import { FindUniqueIncomingMessageBatchOrThrowArgs } from "./args/FindUniqueIncomingMessageBatchOrThrowArgs";
import { GroupByIncomingMessageBatchArgs } from "./args/GroupByIncomingMessageBatchArgs";
import { UpdateManyIncomingMessageBatchArgs } from "./args/UpdateManyIncomingMessageBatchArgs";
import { UpdateOneIncomingMessageBatchArgs } from "./args/UpdateOneIncomingMessageBatchArgs";
import { UpsertOneIncomingMessageBatchArgs } from "./args/UpsertOneIncomingMessageBatchArgs";
import { transformInfoIntoPrismaArgs, getPrismaFromContext, transformCountFieldIntoSelectRelationsCount } from "../../../helpers";
import { IncomingMessageBatch } from "../../../models/IncomingMessageBatch";
import { AffectedRowsOutput } from "../../outputs/AffectedRowsOutput";
import { AggregateIncomingMessageBatch } from "../../outputs/AggregateIncomingMessageBatch";
import { CreateManyAndReturnIncomingMessageBatch } from "../../outputs/CreateManyAndReturnIncomingMessageBatch";
import { IncomingMessageBatchGroupBy } from "../../outputs/IncomingMessageBatchGroupBy";

@TypeGraphQL.Resolver(_of => IncomingMessageBatch)
export class IncomingMessageBatchCrudResolver {
  @TypeGraphQL.Query(_returns => AggregateIncomingMessageBatch, {
    nullable: false
  })
  async aggregateIncomingMessageBatch(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: AggregateIncomingMessageBatchArgs): Promise<AggregateIncomingMessageBatch> {
    return getPrismaFromContext(ctx).incomingMessageBatch.aggregate({
      ...args,
      ...transformInfoIntoPrismaArgs(info),
    });
  }

  @TypeGraphQL.Mutation(_returns => AffectedRowsOutput, {
    nullable: false
  })
  async createManyIncomingMessageBatch(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: CreateManyIncomingMessageBatchArgs): Promise<AffectedRowsOutput> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).incomingMessageBatch.createMany({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }

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

  @TypeGraphQL.Mutation(_returns => IncomingMessageBatch, {
    nullable: false
  })
  async createOneIncomingMessageBatch(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: CreateOneIncomingMessageBatchArgs): Promise<IncomingMessageBatch> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).incomingMessageBatch.create({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }

  @TypeGraphQL.Mutation(_returns => AffectedRowsOutput, {
    nullable: false
  })
  async deleteManyIncomingMessageBatch(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: DeleteManyIncomingMessageBatchArgs): Promise<AffectedRowsOutput> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).incomingMessageBatch.deleteMany({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }

  @TypeGraphQL.Mutation(_returns => IncomingMessageBatch, {
    nullable: true
  })
  async deleteOneIncomingMessageBatch(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: DeleteOneIncomingMessageBatchArgs): Promise<IncomingMessageBatch | null> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).incomingMessageBatch.delete({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }

  @TypeGraphQL.Query(_returns => IncomingMessageBatch, {
    nullable: true
  })
  async findFirstIncomingMessageBatch(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: FindFirstIncomingMessageBatchArgs): Promise<IncomingMessageBatch | null> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).incomingMessageBatch.findFirst({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }

  @TypeGraphQL.Query(_returns => IncomingMessageBatch, {
    nullable: true
  })
  async findFirstIncomingMessageBatchOrThrow(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: FindFirstIncomingMessageBatchOrThrowArgs): Promise<IncomingMessageBatch | null> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).incomingMessageBatch.findFirstOrThrow({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }

  @TypeGraphQL.Query(_returns => [IncomingMessageBatch], {
    nullable: false
  })
  async incomingMessageBatches(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: FindManyIncomingMessageBatchArgs): Promise<IncomingMessageBatch[]> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).incomingMessageBatch.findMany({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }

  @TypeGraphQL.Query(_returns => IncomingMessageBatch, {
    nullable: true
  })
  async incomingMessageBatch(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: FindUniqueIncomingMessageBatchArgs): Promise<IncomingMessageBatch | null> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).incomingMessageBatch.findUnique({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }

  @TypeGraphQL.Query(_returns => IncomingMessageBatch, {
    nullable: true
  })
  async getIncomingMessageBatch(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: FindUniqueIncomingMessageBatchOrThrowArgs): Promise<IncomingMessageBatch | null> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).incomingMessageBatch.findUniqueOrThrow({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }

  @TypeGraphQL.Query(_returns => [IncomingMessageBatchGroupBy], {
    nullable: false
  })
  async groupByIncomingMessageBatch(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: GroupByIncomingMessageBatchArgs): Promise<IncomingMessageBatchGroupBy[]> {
    const { _count, _avg, _sum, _min, _max } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).incomingMessageBatch.groupBy({
      ...args,
      ...Object.fromEntries(
        Object.entries({ _count, _avg, _sum, _min, _max }).filter(([_, v]) => v != null)
      ),
    });
  }

  @TypeGraphQL.Mutation(_returns => AffectedRowsOutput, {
    nullable: false
  })
  async updateManyIncomingMessageBatch(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: UpdateManyIncomingMessageBatchArgs): Promise<AffectedRowsOutput> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).incomingMessageBatch.updateMany({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }

  @TypeGraphQL.Mutation(_returns => IncomingMessageBatch, {
    nullable: true
  })
  async updateOneIncomingMessageBatch(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: UpdateOneIncomingMessageBatchArgs): Promise<IncomingMessageBatch | null> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).incomingMessageBatch.update({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }

  @TypeGraphQL.Mutation(_returns => IncomingMessageBatch, {
    nullable: false
  })
  async upsertOneIncomingMessageBatch(@TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: UpsertOneIncomingMessageBatchArgs): Promise<IncomingMessageBatch> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).incomingMessageBatch.upsert({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }
}
