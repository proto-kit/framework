import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { SettlementCreateInput } from "../../../inputs/SettlementCreateInput";
import { SettlementUpdateInput } from "../../../inputs/SettlementUpdateInput";
import { SettlementWhereUniqueInput } from "../../../inputs/SettlementWhereUniqueInput";

@TypeGraphQL.ArgsType()
export class UpsertOneSettlementArgs {
  @TypeGraphQL.Field(_type => SettlementWhereUniqueInput, {
    nullable: false
  })
  where!: SettlementWhereUniqueInput;

  @TypeGraphQL.Field(_type => SettlementCreateInput, {
    nullable: false
  })
  create!: SettlementCreateInput;

  @TypeGraphQL.Field(_type => SettlementUpdateInput, {
    nullable: false
  })
  update!: SettlementUpdateInput;
}
