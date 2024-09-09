import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { IncomingMessageBatchTransactionCreateManyBatchInputEnvelope } from "../inputs/IncomingMessageBatchTransactionCreateManyBatchInputEnvelope";
import { IncomingMessageBatchTransactionCreateOrConnectWithoutBatchInput } from "../inputs/IncomingMessageBatchTransactionCreateOrConnectWithoutBatchInput";
import { IncomingMessageBatchTransactionCreateWithoutBatchInput } from "../inputs/IncomingMessageBatchTransactionCreateWithoutBatchInput";
import { IncomingMessageBatchTransactionWhereUniqueInput } from "../inputs/IncomingMessageBatchTransactionWhereUniqueInput";

@TypeGraphQL.InputType("IncomingMessageBatchTransactionCreateNestedManyWithoutBatchInput", {})
export class IncomingMessageBatchTransactionCreateNestedManyWithoutBatchInput {
  @TypeGraphQL.Field(_type => [IncomingMessageBatchTransactionCreateWithoutBatchInput], {
    nullable: true
  })
  create?: IncomingMessageBatchTransactionCreateWithoutBatchInput[] | undefined;

  @TypeGraphQL.Field(_type => [IncomingMessageBatchTransactionCreateOrConnectWithoutBatchInput], {
    nullable: true
  })
  connectOrCreate?: IncomingMessageBatchTransactionCreateOrConnectWithoutBatchInput[] | undefined;

  @TypeGraphQL.Field(_type => IncomingMessageBatchTransactionCreateManyBatchInputEnvelope, {
    nullable: true
  })
  createMany?: IncomingMessageBatchTransactionCreateManyBatchInputEnvelope | undefined;

  @TypeGraphQL.Field(_type => [IncomingMessageBatchTransactionWhereUniqueInput], {
    nullable: true
  })
  connect?: IncomingMessageBatchTransactionWhereUniqueInput[] | undefined;
}
