import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { BlockResultCreateInput } from "../../../inputs/BlockResultCreateInput";

@TypeGraphQL.ArgsType()
export class CreateOneBlockResultArgs {
  @TypeGraphQL.Field(_type => BlockResultCreateInput, {
    nullable: false
  })
  data!: BlockResultCreateInput;
}
