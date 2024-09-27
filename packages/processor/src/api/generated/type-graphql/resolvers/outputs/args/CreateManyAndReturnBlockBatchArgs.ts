import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { BatchWhereInput } from "../../inputs/BatchWhereInput";

@TypeGraphQL.ArgsType()
export class CreateManyAndReturnBlockBatchArgs {
  @TypeGraphQL.Field(_type => BatchWhereInput, {
    nullable: true
  })
  where?: BatchWhereInput | undefined;
}
