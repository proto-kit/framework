import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { IncomingMessageBatchTransactionUpdateManyMutationInput } from "../../../inputs/IncomingMessageBatchTransactionUpdateManyMutationInput";
import { IncomingMessageBatchTransactionWhereInput } from "../../../inputs/IncomingMessageBatchTransactionWhereInput";

@TypeGraphQL.ArgsType()
export class UpdateManyIncomingMessageBatchTransactionArgs {
  @TypeGraphQL.Field(_type => IncomingMessageBatchTransactionUpdateManyMutationInput, {
    nullable: false
  })
  data!: IncomingMessageBatchTransactionUpdateManyMutationInput;

  @TypeGraphQL.Field(_type => IncomingMessageBatchTransactionWhereInput, {
    nullable: true
  })
  where?: IncomingMessageBatchTransactionWhereInput | undefined;
}
