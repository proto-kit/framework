import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { BlockResultCreateInput } from "../../../inputs/BlockResultCreateInput";
import { BlockResultUpdateInput } from "../../../inputs/BlockResultUpdateInput";
import { BlockResultWhereUniqueInput } from "../../../inputs/BlockResultWhereUniqueInput";

@TypeGraphQL.ArgsType()
export class UpsertOneBlockResultArgs {
  @TypeGraphQL.Field(_type => BlockResultWhereUniqueInput, {
    nullable: false
  })
  where!: BlockResultWhereUniqueInput;

  @TypeGraphQL.Field(_type => BlockResultCreateInput, {
    nullable: false
  })
  create!: BlockResultCreateInput;

  @TypeGraphQL.Field(_type => BlockResultUpdateInput, {
    nullable: false
  })
  update!: BlockResultUpdateInput;
}
