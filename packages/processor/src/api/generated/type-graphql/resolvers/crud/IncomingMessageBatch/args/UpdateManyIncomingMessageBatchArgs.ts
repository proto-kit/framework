import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { IncomingMessageBatchUpdateManyMutationInput } from "../../../inputs/IncomingMessageBatchUpdateManyMutationInput";
import { IncomingMessageBatchWhereInput } from "../../../inputs/IncomingMessageBatchWhereInput";

@TypeGraphQL.ArgsType()
export class UpdateManyIncomingMessageBatchArgs {
  @TypeGraphQL.Field(_type => IncomingMessageBatchUpdateManyMutationInput, {
    nullable: false
  })
  data!: IncomingMessageBatchUpdateManyMutationInput;

  @TypeGraphQL.Field(_type => IncomingMessageBatchWhereInput, {
    nullable: true
  })
  where?: IncomingMessageBatchWhereInput | undefined;
}
