import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { IncomingMessageBatchTransactionWhereInput } from "../../inputs/IncomingMessageBatchTransactionWhereInput";

@TypeGraphQL.ArgsType()
export class TransactionCountIncomingMessageBatchTransactionArgs {
  @TypeGraphQL.Field(_type => IncomingMessageBatchTransactionWhereInput, {
    nullable: true
  })
  where?: IncomingMessageBatchTransactionWhereInput | undefined;
}
