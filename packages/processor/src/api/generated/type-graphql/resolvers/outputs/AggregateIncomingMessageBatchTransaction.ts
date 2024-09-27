import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { IncomingMessageBatchTransactionAvgAggregate } from "../outputs/IncomingMessageBatchTransactionAvgAggregate";
import { IncomingMessageBatchTransactionCountAggregate } from "../outputs/IncomingMessageBatchTransactionCountAggregate";
import { IncomingMessageBatchTransactionMaxAggregate } from "../outputs/IncomingMessageBatchTransactionMaxAggregate";
import { IncomingMessageBatchTransactionMinAggregate } from "../outputs/IncomingMessageBatchTransactionMinAggregate";
import { IncomingMessageBatchTransactionSumAggregate } from "../outputs/IncomingMessageBatchTransactionSumAggregate";

@TypeGraphQL.ObjectType("AggregateIncomingMessageBatchTransaction", {})
export class AggregateIncomingMessageBatchTransaction {
  @TypeGraphQL.Field(_type => IncomingMessageBatchTransactionCountAggregate, {
    nullable: true
  })
  _count!: IncomingMessageBatchTransactionCountAggregate | null;

  @TypeGraphQL.Field(_type => IncomingMessageBatchTransactionAvgAggregate, {
    nullable: true
  })
  _avg!: IncomingMessageBatchTransactionAvgAggregate | null;

  @TypeGraphQL.Field(_type => IncomingMessageBatchTransactionSumAggregate, {
    nullable: true
  })
  _sum!: IncomingMessageBatchTransactionSumAggregate | null;

  @TypeGraphQL.Field(_type => IncomingMessageBatchTransactionMinAggregate, {
    nullable: true
  })
  _min!: IncomingMessageBatchTransactionMinAggregate | null;

  @TypeGraphQL.Field(_type => IncomingMessageBatchTransactionMaxAggregate, {
    nullable: true
  })
  _max!: IncomingMessageBatchTransactionMaxAggregate | null;
}
