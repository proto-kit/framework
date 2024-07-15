import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { BlockWhereUniqueInput } from "../../../inputs/BlockWhereUniqueInput";

@TypeGraphQL.ArgsType()
export class FindUniqueBlockOrThrowArgs {
  @TypeGraphQL.Field(_type => BlockWhereUniqueInput, {
    nullable: false
  })
  where!: BlockWhereUniqueInput;
}
