import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { SettlementUpdateInput } from "../../../inputs/SettlementUpdateInput";
import { SettlementWhereUniqueInput } from "../../../inputs/SettlementWhereUniqueInput";

@TypeGraphQL.ArgsType()
export class UpdateOneSettlementArgs {
  @TypeGraphQL.Field(_type => SettlementUpdateInput, {
    nullable: false
  })
  data!: SettlementUpdateInput;

  @TypeGraphQL.Field(_type => SettlementWhereUniqueInput, {
    nullable: false
  })
  where!: SettlementWhereUniqueInput;
}
