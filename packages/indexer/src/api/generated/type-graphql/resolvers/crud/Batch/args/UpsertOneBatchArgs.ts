import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { BatchCreateInput } from "../../../inputs/BatchCreateInput";
import { BatchUpdateInput } from "../../../inputs/BatchUpdateInput";
import { BatchWhereUniqueInput } from "../../../inputs/BatchWhereUniqueInput";

@TypeGraphQL.ArgsType()
export class UpsertOneBatchArgs {
  @TypeGraphQL.Field(_type => BatchWhereUniqueInput, {
    nullable: false
  })
  where!: BatchWhereUniqueInput;

  @TypeGraphQL.Field(_type => BatchCreateInput, {
    nullable: false
  })
  create!: BatchCreateInput;

  @TypeGraphQL.Field(_type => BatchUpdateInput, {
    nullable: false
  })
  update!: BatchUpdateInput;
}
