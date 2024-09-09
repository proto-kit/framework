import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { IncomingMessageBatchTransactionWhereUniqueInput } from "../../../inputs/IncomingMessageBatchTransactionWhereUniqueInput";

@TypeGraphQL.ArgsType()
export class FindUniqueIncomingMessageBatchTransactionArgs {
  @TypeGraphQL.Field(_type => IncomingMessageBatchTransactionWhereUniqueInput, {
    nullable: false
  })
  where!: IncomingMessageBatchTransactionWhereUniqueInput;
}
