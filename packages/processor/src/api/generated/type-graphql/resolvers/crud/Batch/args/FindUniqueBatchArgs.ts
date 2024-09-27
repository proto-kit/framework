import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { BatchWhereUniqueInput } from "../../../inputs/BatchWhereUniqueInput";

@TypeGraphQL.ArgsType()
export class FindUniqueBatchArgs {
  @TypeGraphQL.Field(_type => BatchWhereUniqueInput, {
    nullable: false
  })
  where!: BatchWhereUniqueInput;
}
