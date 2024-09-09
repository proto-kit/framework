import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { StateAvgAggregate } from "../outputs/StateAvgAggregate";
import { StateCountAggregate } from "../outputs/StateCountAggregate";
import { StateMaxAggregate } from "../outputs/StateMaxAggregate";
import { StateMinAggregate } from "../outputs/StateMinAggregate";
import { StateSumAggregate } from "../outputs/StateSumAggregate";

@TypeGraphQL.ObjectType("AggregateState", {})
export class AggregateState {
  @TypeGraphQL.Field(_type => StateCountAggregate, {
    nullable: true
  })
  _count!: StateCountAggregate | null;

  @TypeGraphQL.Field(_type => StateAvgAggregate, {
    nullable: true
  })
  _avg!: StateAvgAggregate | null;

  @TypeGraphQL.Field(_type => StateSumAggregate, {
    nullable: true
  })
  _sum!: StateSumAggregate | null;

  @TypeGraphQL.Field(_type => StateMinAggregate, {
    nullable: true
  })
  _min!: StateMinAggregate | null;

  @TypeGraphQL.Field(_type => StateMaxAggregate, {
    nullable: true
  })
  _max!: StateMaxAggregate | null;
}
