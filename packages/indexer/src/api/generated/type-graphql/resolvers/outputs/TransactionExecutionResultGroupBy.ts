import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { TransactionExecutionResultCountAggregate } from "../outputs/TransactionExecutionResultCountAggregate";
import { TransactionExecutionResultMaxAggregate } from "../outputs/TransactionExecutionResultMaxAggregate";
import { TransactionExecutionResultMinAggregate } from "../outputs/TransactionExecutionResultMinAggregate";

@TypeGraphQL.ObjectType("TransactionExecutionResultGroupBy", {})
export class TransactionExecutionResultGroupBy {
  @TypeGraphQL.Field(_type => GraphQLScalars.JSONResolver, {
    nullable: false
  })
  stateTransitions!: Prisma.JsonValue;

  @TypeGraphQL.Field(_type => GraphQLScalars.JSONResolver, {
    nullable: false
  })
  protocolTransitions!: Prisma.JsonValue;

  @TypeGraphQL.Field(_type => Boolean, {
    nullable: false
  })
  status!: boolean;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  statusMessage!: string | null;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  txHash!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  blockHash!: string;

  @TypeGraphQL.Field(_type => TransactionExecutionResultCountAggregate, {
    nullable: true
  })
  _count!: TransactionExecutionResultCountAggregate | null;

  @TypeGraphQL.Field(_type => TransactionExecutionResultMinAggregate, {
    nullable: true
  })
  _min!: TransactionExecutionResultMinAggregate | null;

  @TypeGraphQL.Field(_type => TransactionExecutionResultMaxAggregate, {
    nullable: true
  })
  _max!: TransactionExecutionResultMaxAggregate | null;
}
