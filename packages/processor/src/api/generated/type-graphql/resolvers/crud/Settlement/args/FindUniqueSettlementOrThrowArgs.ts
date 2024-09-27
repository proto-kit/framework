import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { SettlementWhereUniqueInput } from "../../../inputs/SettlementWhereUniqueInput";

@TypeGraphQL.ArgsType()
export class FindUniqueSettlementOrThrowArgs {
  @TypeGraphQL.Field(_type => SettlementWhereUniqueInput, {
    nullable: false
  })
  where!: SettlementWhereUniqueInput;
}
