import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { IncomingMessageBatchTransactionCreateInput } from "../../../inputs/IncomingMessageBatchTransactionCreateInput";

@TypeGraphQL.ArgsType()
export class CreateOneIncomingMessageBatchTransactionArgs {
  @TypeGraphQL.Field(_type => IncomingMessageBatchTransactionCreateInput, {
    nullable: false
  })
  data!: IncomingMessageBatchTransactionCreateInput;
}
