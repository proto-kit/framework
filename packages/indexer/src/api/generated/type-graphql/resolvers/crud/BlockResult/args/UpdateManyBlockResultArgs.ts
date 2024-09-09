import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { BlockResultUpdateManyMutationInput } from "../../../inputs/BlockResultUpdateManyMutationInput";
import { BlockResultWhereInput } from "../../../inputs/BlockResultWhereInput";

@TypeGraphQL.ArgsType()
export class UpdateManyBlockResultArgs {
  @TypeGraphQL.Field(_type => BlockResultUpdateManyMutationInput, {
    nullable: false
  })
  data!: BlockResultUpdateManyMutationInput;

  @TypeGraphQL.Field(_type => BlockResultWhereInput, {
    nullable: true
  })
  where?: BlockResultWhereInput | undefined;
}
