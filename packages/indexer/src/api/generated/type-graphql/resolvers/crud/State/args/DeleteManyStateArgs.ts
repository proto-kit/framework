import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { StateWhereInput } from "../../../inputs/StateWhereInput";

@TypeGraphQL.ArgsType()
export class DeleteManyStateArgs {
  @TypeGraphQL.Field(_type => StateWhereInput, {
    nullable: true
  })
  where?: StateWhereInput | undefined;
}
