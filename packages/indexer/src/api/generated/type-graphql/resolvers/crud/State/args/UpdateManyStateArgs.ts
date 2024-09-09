import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { StateUpdateManyMutationInput } from "../../../inputs/StateUpdateManyMutationInput";
import { StateWhereInput } from "../../../inputs/StateWhereInput";

@TypeGraphQL.ArgsType()
export class UpdateManyStateArgs {
  @TypeGraphQL.Field(_type => StateUpdateManyMutationInput, {
    nullable: false
  })
  data!: StateUpdateManyMutationInput;

  @TypeGraphQL.Field(_type => StateWhereInput, {
    nullable: true
  })
  where?: StateWhereInput | undefined;
}
