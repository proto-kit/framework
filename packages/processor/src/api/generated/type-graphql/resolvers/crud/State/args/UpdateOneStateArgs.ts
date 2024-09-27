import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { StateUpdateInput } from "../../../inputs/StateUpdateInput";
import { StateWhereUniqueInput } from "../../../inputs/StateWhereUniqueInput";

@TypeGraphQL.ArgsType()
export class UpdateOneStateArgs {
  @TypeGraphQL.Field(_type => StateUpdateInput, {
    nullable: false
  })
  data!: StateUpdateInput;

  @TypeGraphQL.Field(_type => StateWhereUniqueInput, {
    nullable: false
  })
  where!: StateWhereUniqueInput;
}
