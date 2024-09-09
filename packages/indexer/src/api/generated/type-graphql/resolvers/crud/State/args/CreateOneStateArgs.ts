import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { StateCreateInput } from "../../../inputs/StateCreateInput";

@TypeGraphQL.ArgsType()
export class CreateOneStateArgs {
  @TypeGraphQL.Field(_type => StateCreateInput, {
    nullable: false
  })
  data!: StateCreateInput;
}
