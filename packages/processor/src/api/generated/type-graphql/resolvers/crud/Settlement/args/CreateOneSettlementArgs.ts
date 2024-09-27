import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { SettlementCreateInput } from "../../../inputs/SettlementCreateInput";

@TypeGraphQL.ArgsType()
export class CreateOneSettlementArgs {
  @TypeGraphQL.Field(_type => SettlementCreateInput, {
    nullable: false
  })
  data!: SettlementCreateInput;
}
