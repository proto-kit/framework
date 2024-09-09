import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { BlockResultWhereUniqueInput } from "../../../inputs/BlockResultWhereUniqueInput";

@TypeGraphQL.ArgsType()
export class DeleteOneBlockResultArgs {
  @TypeGraphQL.Field(_type => BlockResultWhereUniqueInput, {
    nullable: false
  })
  where!: BlockResultWhereUniqueInput;
}
