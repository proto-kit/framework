import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { SettlementCountBatchesArgs } from "./args/SettlementCountBatchesArgs";

@TypeGraphQL.ObjectType("SettlementCount", {})
export class SettlementCount {
  batches!: number;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    name: "batches",
    nullable: false
  })
  getBatches(@TypeGraphQL.Root() root: SettlementCount, @TypeGraphQL.Args() args: SettlementCountBatchesArgs): number {
    return root.batches;
  }
}
