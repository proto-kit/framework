import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { BlockWhereInput } from "../../../inputs/BlockWhereInput";

@TypeGraphQL.ArgsType()
export class BlockSuccessorArgs {
  @TypeGraphQL.Field(_type => BlockWhereInput, {
    nullable: true
  })
  where?: BlockWhereInput | undefined;
}
