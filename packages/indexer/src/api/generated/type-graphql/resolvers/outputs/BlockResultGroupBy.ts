import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BlockResultCountAggregate } from "../outputs/BlockResultCountAggregate";
import { BlockResultMaxAggregate } from "../outputs/BlockResultMaxAggregate";
import { BlockResultMinAggregate } from "../outputs/BlockResultMinAggregate";

@TypeGraphQL.ObjectType("BlockResultGroupBy", {})
export class BlockResultGroupBy {
  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  blockHash!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  stateRoot!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  blockHashRoot!: string;

  @TypeGraphQL.Field(_type => GraphQLScalars.JSONResolver, {
    nullable: false
  })
  afterNetworkState!: Prisma.JsonValue;

  @TypeGraphQL.Field(_type => GraphQLScalars.JSONResolver, {
    nullable: false
  })
  blockStateTransitions!: Prisma.JsonValue;

  @TypeGraphQL.Field(_type => GraphQLScalars.JSONResolver, {
    nullable: false
  })
  blockHashWitness!: Prisma.JsonValue;

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
