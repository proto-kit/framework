import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { IncomingMessageBatchAvgAggregate } from "../outputs/IncomingMessageBatchAvgAggregate";
import { IncomingMessageBatchCountAggregate } from "../outputs/IncomingMessageBatchCountAggregate";
import { IncomingMessageBatchMaxAggregate } from "../outputs/IncomingMessageBatchMaxAggregate";
import { IncomingMessageBatchMinAggregate } from "../outputs/IncomingMessageBatchMinAggregate";
import { IncomingMessageBatchSumAggregate } from "../outputs/IncomingMessageBatchSumAggregate";

@TypeGraphQL.ObjectType("AggregateIncomingMessageBatch", {})
export class AggregateIncomingMessageBatch {
  @TypeGraphQL.Field(_type => IncomingMessageBatchCountAggregate, {
    nullable: true
  })
  _count!: IncomingMessageBatchCountAggregate | null;

  @TypeGraphQL.Field(_type => IncomingMessageBatchAvgAggregate, {
    nullable: true
  })
  _avg!: IncomingMessageBatchAvgAggregate | null;

  @TypeGraphQL.Field(_type => IncomingMessageBatchSumAggregate, {
    nullable: true
  })
  _sum!: IncomingMessageBatchSumAggregate | null;

  @TypeGraphQL.Field(_type => IncomingMessageBatchMinAggregate, {
    nullable: true
  })
  _min!: IncomingMessageBatchMinAggregate | null;

  @TypeGraphQL.Field(_type => IncomingMessageBatchMaxAggregate, {
    nullable: true
  })
  _max!: IncomingMessageBatchMaxAggregate | null;
}
