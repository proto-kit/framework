import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { BatchUpdateManyMutationInput } from "../../../inputs/BatchUpdateManyMutationInput";
import { BatchWhereInput } from "../../../inputs/BatchWhereInput";

@TypeGraphQL.ArgsType()
export class UpdateManyBatchArgs {
  @TypeGraphQL.Field(_type => BatchUpdateManyMutationInput, {
    nullable: false
  })
  data!: BatchUpdateManyMutationInput;

  @TypeGraphQL.Field(_type => BatchWhereInput, {
    nullable: true
  })
  where?: BatchWhereInput | undefined;
}
