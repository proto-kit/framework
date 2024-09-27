import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { IncomingMessageBatchTransactionOrderByWithRelationInput } from "../../../inputs/IncomingMessageBatchTransactionOrderByWithRelationInput";
import { IncomingMessageBatchTransactionWhereInput } from "../../../inputs/IncomingMessageBatchTransactionWhereInput";
import { IncomingMessageBatchTransactionWhereUniqueInput } from "../../../inputs/IncomingMessageBatchTransactionWhereUniqueInput";

@TypeGraphQL.ArgsType()
export class AggregateIncomingMessageBatchTransactionArgs {
  @TypeGraphQL.Field(_type => IncomingMessageBatchTransactionWhereInput, {
    nullable: true
  })
  where?: IncomingMessageBatchTransactionWhereInput | undefined;

  @TypeGraphQL.Field(_type => [IncomingMessageBatchTransactionOrderByWithRelationInput], {
    nullable: true
  })
  orderBy?: IncomingMessageBatchTransactionOrderByWithRelationInput[] | undefined;

  @TypeGraphQL.Field(_type => IncomingMessageBatchTransactionWhereUniqueInput, {
    nullable: true
  })
  cursor?: IncomingMessageBatchTransactionWhereUniqueInput | undefined;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: true
  })
  take?: number | undefined;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: true
  })
  skip?: number | undefined;
}
