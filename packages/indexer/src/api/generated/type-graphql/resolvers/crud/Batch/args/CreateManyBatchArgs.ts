import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { BatchCreateManyInput } from "../../../inputs/BatchCreateManyInput";

@TypeGraphQL.ArgsType()
export class CreateManyBatchArgs {
  @TypeGraphQL.Field(_type => [BatchCreateManyInput], {
    nullable: false
  })
  data!: BatchCreateManyInput[];

  @TypeGraphQL.Field(_type => Boolean, {
    nullable: true
  })
  skipDuplicates?: boolean | undefined;
}
