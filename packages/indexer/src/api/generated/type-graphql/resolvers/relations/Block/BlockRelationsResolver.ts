import * as TypeGraphQL from "type-graphql";
import type { GraphQLResolveInfo } from "graphql";
import { Batch } from "../../../models/Batch";
import { Block } from "../../../models/Block";
import { BlockResult } from "../../../models/BlockResult";
import { TransactionExecutionResult } from "../../../models/TransactionExecutionResult";
import { BlockBatchArgs } from "./args/BlockBatchArgs";
import { BlockParentArgs } from "./args/BlockParentArgs";
import { BlockResultArgs } from "./args/BlockResultArgs";
import { BlockSuccessorArgs } from "./args/BlockSuccessorArgs";
import { BlockTransactionsArgs } from "./args/BlockTransactionsArgs";
import { transformInfoIntoPrismaArgs, getPrismaFromContext, transformCountFieldIntoSelectRelationsCount } from "../../../helpers";

@TypeGraphQL.Resolver(_of => Block)
export class BlockRelationsResolver {
  @TypeGraphQL.FieldResolver(_type => Block, {
    nullable: true
  })
  async parent(@TypeGraphQL.Root() block: Block, @TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: BlockParentArgs): Promise<Block | null> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).block.findUniqueOrThrow({
      where: {
        hash: block.hash,
      },
    }).parent({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }

  @TypeGraphQL.FieldResolver(_type => Block, {
    nullable: true
  })
  async successor(@TypeGraphQL.Root() block: Block, @TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: BlockSuccessorArgs): Promise<Block | null> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).block.findUniqueOrThrow({
      where: {
        hash: block.hash,
      },
    }).successor({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }

  @TypeGraphQL.FieldResolver(_type => [TransactionExecutionResult], {
    nullable: false
  })
  async transactions(@TypeGraphQL.Root() block: Block, @TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: BlockTransactionsArgs): Promise<TransactionExecutionResult[]> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).block.findUniqueOrThrow({
      where: {
        hash: block.hash,
      },
    }).transactions({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }

  @TypeGraphQL.FieldResolver(_type => BlockResult, {
    nullable: true
  })
  async result(@TypeGraphQL.Root() block: Block, @TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: BlockResultArgs): Promise<BlockResult | null> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).block.findUniqueOrThrow({
      where: {
        hash: block.hash,
      },
    }).result({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }

  @TypeGraphQL.FieldResolver(_type => Batch, {
    nullable: true
  })
  async batch(@TypeGraphQL.Root() block: Block, @TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: BlockBatchArgs): Promise<Batch | null> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).block.findUniqueOrThrow({
      where: {
        hash: block.hash,
      },
    }).batch({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }
}
