import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { BatchCreateInput } from "../../../inputs/BatchCreateInput";

@TypeGraphQL.ArgsType()
export class CreateOneBatchArgs {
  @TypeGraphQL.Field(_type => BatchCreateInput, {
    nullable: false
  })
  data!: BatchCreateInput;
}
