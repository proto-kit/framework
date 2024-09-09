import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { CreateManyAndReturnBatchSettlementArgs } from "./args/CreateManyAndReturnBatchSettlementArgs";
import { Settlement } from "../../models/Settlement";

@TypeGraphQL.ObjectType("CreateManyAndReturnBatch", {})
export class CreateManyAndReturnBatch {
  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: false
  })
  height!: number;

  @TypeGraphQL.Field(_type => GraphQLScalars.JSONResolver, {
    nullable: false
  })
  proof!: Prisma.JsonValue;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  settlementTransactionHash!: string | null;

  settlement!: Settlement | null;

  @TypeGraphQL.Field(_type => Settlement, {
    name: "settlement",
    nullable: true
  })
  getSettlement(@TypeGraphQL.Root() root: CreateManyAndReturnBatch, @TypeGraphQL.Args() args: CreateManyAndReturnBatchSettlementArgs): Settlement | null {
    return root.settlement;
  }
}
