import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { BlockResultWhereInput } from "../../../inputs/BlockResultWhereInput";

@TypeGraphQL.ArgsType()
export class BlockResultArgs {
  @TypeGraphQL.Field(_type => BlockResultWhereInput, {
    nullable: true
  })
  where?: BlockResultWhereInput | undefined;
}
