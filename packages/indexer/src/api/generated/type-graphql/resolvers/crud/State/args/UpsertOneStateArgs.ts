import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { StateCreateInput } from "../../../inputs/StateCreateInput";
import { StateUpdateInput } from "../../../inputs/StateUpdateInput";
import { StateWhereUniqueInput } from "../../../inputs/StateWhereUniqueInput";

@TypeGraphQL.ArgsType()
export class UpsertOneStateArgs {
  @TypeGraphQL.Field(_type => StateWhereUniqueInput, {
    nullable: false
  })
  where!: StateWhereUniqueInput;

  @TypeGraphQL.Field(_type => StateCreateInput, {
    nullable: false
  })
  create!: StateCreateInput;

  @TypeGraphQL.Field(_type => StateUpdateInput, {
    nullable: false
  })
  update!: StateUpdateInput;
}
