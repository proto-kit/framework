import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { BatchUpdateInput } from "../../../inputs/BatchUpdateInput";
import { BatchWhereUniqueInput } from "../../../inputs/BatchWhereUniqueInput";

@TypeGraphQL.ArgsType()
export class UpdateOneBatchArgs {
  @TypeGraphQL.Field(_type => BatchUpdateInput, {
    nullable: false
  })
  data!: BatchUpdateInput;

  @TypeGraphQL.Field(_type => BatchWhereUniqueInput, {
    nullable: false
  })
  where!: BatchWhereUniqueInput;
}
