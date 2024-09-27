import * as TypeGraphQL from "type-graphql";
import type { GraphQLResolveInfo } from "graphql";
import { Batch } from "../../../models/Batch";
import { Settlement } from "../../../models/Settlement";
import { SettlementBatchesArgs } from "./args/SettlementBatchesArgs";
import { transformInfoIntoPrismaArgs, getPrismaFromContext, transformCountFieldIntoSelectRelationsCount } from "../../../helpers";

@TypeGraphQL.Resolver(_of => Settlement)
export class SettlementRelationsResolver {
  @TypeGraphQL.FieldResolver(_type => [Batch], {
    nullable: false
  })
  async batches(@TypeGraphQL.Root() settlement: Settlement, @TypeGraphQL.Ctx() ctx: any, @TypeGraphQL.Info() info: GraphQLResolveInfo, @TypeGraphQL.Args() args: SettlementBatchesArgs): Promise<Batch[]> {
    const { _count } = transformInfoIntoPrismaArgs(info);
    return getPrismaFromContext(ctx).settlement.findUniqueOrThrow({
      where: {
        transactionHash: settlement.transactionHash,
      },
    }).batches({
      ...args,
      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
    });
  }
}
