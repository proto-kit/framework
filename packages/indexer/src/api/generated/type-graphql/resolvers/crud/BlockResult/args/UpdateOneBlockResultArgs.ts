import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { BlockResultUpdateInput } from "../../../inputs/BlockResultUpdateInput";
import { BlockResultWhereUniqueInput } from "../../../inputs/BlockResultWhereUniqueInput";

@TypeGraphQL.ArgsType()
export class UpdateOneBlockResultArgs {
  @TypeGraphQL.Field(_type => BlockResultUpdateInput, {
    nullable: false
  })
  data!: BlockResultUpdateInput;

  @TypeGraphQL.Field(_type => BlockResultWhereUniqueInput, {
    nullable: false
  })
  where!: BlockResultWhereUniqueInput;
}
