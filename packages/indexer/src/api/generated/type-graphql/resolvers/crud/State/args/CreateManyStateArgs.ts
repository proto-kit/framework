import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { StateCreateManyInput } from "../../../inputs/StateCreateManyInput";

@TypeGraphQL.ArgsType()
export class CreateManyStateArgs {
  @TypeGraphQL.Field(_type => [StateCreateManyInput], {
    nullable: false
  })
  data!: StateCreateManyInput[];

  @TypeGraphQL.Field(_type => Boolean, {
    nullable: true
  })
  skipDuplicates?: boolean | undefined;
}
