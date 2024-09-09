import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { IncomingMessageBatchTransactionCreateInput } from "../../../inputs/IncomingMessageBatchTransactionCreateInput";
import { IncomingMessageBatchTransactionUpdateInput } from "../../../inputs/IncomingMessageBatchTransactionUpdateInput";
import { IncomingMessageBatchTransactionWhereUniqueInput } from "../../../inputs/IncomingMessageBatchTransactionWhereUniqueInput";

@TypeGraphQL.ArgsType()
export class UpsertOneIncomingMessageBatchTransactionArgs {
  @TypeGraphQL.Field(_type => IncomingMessageBatchTransactionWhereUniqueInput, {
    nullable: false
  })
  where!: IncomingMessageBatchTransactionWhereUniqueInput;

  @TypeGraphQL.Field(_type => IncomingMessageBatchTransactionCreateInput, {
    nullable: false
  })
  create!: IncomingMessageBatchTransactionCreateInput;

  @TypeGraphQL.Field(_type => IncomingMessageBatchTransactionUpdateInput, {
    nullable: false
  })
  update!: IncomingMessageBatchTransactionUpdateInput;
}
