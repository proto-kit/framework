import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { IncomingMessageBatchTransactionUpdateInput } from "../../../inputs/IncomingMessageBatchTransactionUpdateInput";
import { IncomingMessageBatchTransactionWhereUniqueInput } from "../../../inputs/IncomingMessageBatchTransactionWhereUniqueInput";

@TypeGraphQL.ArgsType()
export class UpdateOneIncomingMessageBatchTransactionArgs {
  @TypeGraphQL.Field(_type => IncomingMessageBatchTransactionUpdateInput, {
    nullable: false
  })
  data!: IncomingMessageBatchTransactionUpdateInput;

  @TypeGraphQL.Field(_type => IncomingMessageBatchTransactionWhereUniqueInput, {
    nullable: false
  })
  where!: IncomingMessageBatchTransactionWhereUniqueInput;
}
