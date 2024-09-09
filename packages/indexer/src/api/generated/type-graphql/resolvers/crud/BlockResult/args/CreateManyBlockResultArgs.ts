import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { BlockResultCreateManyInput } from "../../../inputs/BlockResultCreateManyInput";

@TypeGraphQL.ArgsType()
export class CreateManyBlockResultArgs {
  @TypeGraphQL.Field(_type => [BlockResultCreateManyInput], {
    nullable: false
  })
  data!: BlockResultCreateManyInput[];

  @TypeGraphQL.Field(_type => Boolean, {
    nullable: true
  })
  skipDuplicates?: boolean | undefined;
}
