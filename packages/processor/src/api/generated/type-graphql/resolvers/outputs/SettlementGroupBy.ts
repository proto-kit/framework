import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { SettlementCountAggregate } from "../outputs/SettlementCountAggregate";
import { SettlementMaxAggregate } from "../outputs/SettlementMaxAggregate";
import { SettlementMinAggregate } from "../outputs/SettlementMinAggregate";

@TypeGraphQL.ObjectType("SettlementGroupBy", {})
export class SettlementGroupBy {
  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  transactionHash!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  promisedMessagesHash!: string;

  @TypeGraphQL.Field(_type => SettlementCountAggregate, {
    nullable: true
  })
  _count!: SettlementCountAggregate | null;

  @TypeGraphQL.Field(_type => SettlementMinAggregate, {
    nullable: true
  })
  _min!: SettlementMinAggregate | null;

  @TypeGraphQL.Field(_type => SettlementMaxAggregate, {
    nullable: true
  })
  _max!: SettlementMaxAggregate | null;
}
