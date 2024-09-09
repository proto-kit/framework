import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BatchAvgAggregate } from "../outputs/BatchAvgAggregate";
import { BatchCountAggregate } from "../outputs/BatchCountAggregate";
import { BatchMaxAggregate } from "../outputs/BatchMaxAggregate";
import { BatchMinAggregate } from "../outputs/BatchMinAggregate";
import { BatchSumAggregate } from "../outputs/BatchSumAggregate";

@TypeGraphQL.ObjectType("BatchGroupBy", {})
export class BatchGroupBy {
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

  @TypeGraphQL.Field(_type => BatchCountAggregate, {
    nullable: true
  })
  _count!: BatchCountAggregate | null;

  @TypeGraphQL.Field(_type => BatchAvgAggregate, {
    nullable: true
  })
  _avg!: BatchAvgAggregate | null;

  @TypeGraphQL.Field(_type => BatchSumAggregate, {
    nullable: true
  })
  _sum!: BatchSumAggregate | null;

  @TypeGraphQL.Field(_type => BatchMinAggregate, {
    nullable: true
  })
  _min!: BatchMinAggregate | null;

  @TypeGraphQL.Field(_type => BatchMaxAggregate, {
    nullable: true
  })
  _max!: BatchMaxAggregate | null;
}
