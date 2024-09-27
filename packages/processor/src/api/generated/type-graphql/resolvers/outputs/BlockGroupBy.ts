import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BlockAvgAggregate } from "../outputs/BlockAvgAggregate";
import { BlockCountAggregate } from "../outputs/BlockCountAggregate";
import { BlockMaxAggregate } from "../outputs/BlockMaxAggregate";
import { BlockMinAggregate } from "../outputs/BlockMinAggregate";
import { BlockSumAggregate } from "../outputs/BlockSumAggregate";

@TypeGraphQL.ObjectType("BlockGroupBy", {})
export class BlockGroupBy {
  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  hash!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  transactionsHash!: string;

  @TypeGraphQL.Field(_type => GraphQLScalars.JSONResolver, {
    nullable: false
  })
  beforeNetworkState!: Prisma.JsonValue;

  @TypeGraphQL.Field(_type => GraphQLScalars.JSONResolver, {
    nullable: false
  })
  duringNetworkState!: Prisma.JsonValue;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: false
  })
  height!: number;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  fromEternalTransactionsHash!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  toEternalTransactionsHash!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  fromBlockHashRoot!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  fromMessagesHash!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  toMessagesHash!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  parentHash!: string | null;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: true
  })
  batchHeight!: number | null;

  @TypeGraphQL.Field(_type => BlockCountAggregate, {
    nullable: true
  })
  _count!: BlockCountAggregate | null;

  @TypeGraphQL.Field(_type => BlockAvgAggregate, {
    nullable: true
  })
  _avg!: BlockAvgAggregate | null;

  @TypeGraphQL.Field(_type => BlockSumAggregate, {
    nullable: true
  })
  _sum!: BlockSumAggregate | null;

  @TypeGraphQL.Field(_type => BlockMinAggregate, {
    nullable: true
  })
  _min!: BlockMinAggregate | null;

  @TypeGraphQL.Field(_type => BlockMaxAggregate, {
    nullable: true
  })
  _max!: BlockMaxAggregate | null;
}
