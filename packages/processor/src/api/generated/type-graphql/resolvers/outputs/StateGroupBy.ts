import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { StateAvgAggregate } from "../outputs/StateAvgAggregate";
import { StateCountAggregate } from "../outputs/StateCountAggregate";
import { StateMaxAggregate } from "../outputs/StateMaxAggregate";
import { StateMinAggregate } from "../outputs/StateMinAggregate";
import { StateSumAggregate } from "../outputs/StateSumAggregate";

@TypeGraphQL.ObjectType("StateGroupBy", {})
export class StateGroupBy {
  @TypeGraphQL.Field(_type => DecimalJSScalar, {
    nullable: false
  })
  path!: Prisma.Decimal;

  @TypeGraphQL.Field(_type => [DecimalJSScalar], {
    nullable: true
  })
  values!: Prisma.Decimal[] | null;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  mask!: string;

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
