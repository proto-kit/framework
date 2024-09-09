import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BlockResultCountAggregate } from "../outputs/BlockResultCountAggregate";
import { BlockResultMaxAggregate } from "../outputs/BlockResultMaxAggregate";
import { BlockResultMinAggregate } from "../outputs/BlockResultMinAggregate";

@TypeGraphQL.ObjectType("AggregateBlockResult", {})
export class AggregateBlockResult {
  @TypeGraphQL.Field(_type => BlockResultCountAggregate, {
    nullable: true
  })
  _count!: BlockResultCountAggregate | null;

  @TypeGraphQL.Field(_type => BlockResultMinAggregate, {
    nullable: true
  })
  _min!: BlockResultMinAggregate | null;

  @TypeGraphQL.Field(_type => BlockResultMaxAggregate, {
    nullable: true
  })
  _max!: BlockResultMaxAggregate | null;
}
