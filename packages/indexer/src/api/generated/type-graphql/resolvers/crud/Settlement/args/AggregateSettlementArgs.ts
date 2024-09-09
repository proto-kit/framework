import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { SettlementOrderByWithRelationInput } from "../../../inputs/SettlementOrderByWithRelationInput";
import { SettlementWhereInput } from "../../../inputs/SettlementWhereInput";
import { SettlementWhereUniqueInput } from "../../../inputs/SettlementWhereUniqueInput";

@TypeGraphQL.ArgsType()
export class AggregateSettlementArgs {
  @TypeGraphQL.Field(_type => SettlementWhereInput, {
    nullable: true
  })
  where?: SettlementWhereInput | undefined;

  @TypeGraphQL.Field(_type => [SettlementOrderByWithRelationInput], {
    nullable: true
  })
  orderBy?: SettlementOrderByWithRelationInput[] | undefined;

  @TypeGraphQL.Field(_type => SettlementWhereUniqueInput, {
    nullable: true
  })
  cursor?: SettlementWhereUniqueInput | undefined;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: true
  })
  take?: number | undefined;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: true
  })
  skip?: number | undefined;
}
