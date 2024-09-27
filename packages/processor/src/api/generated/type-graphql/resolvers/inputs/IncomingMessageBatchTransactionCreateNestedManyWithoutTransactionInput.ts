import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { IncomingMessageBatchTransactionCreateManyTransactionInputEnvelope } from "../inputs/IncomingMessageBatchTransactionCreateManyTransactionInputEnvelope";
import { IncomingMessageBatchTransactionCreateOrConnectWithoutTransactionInput } from "../inputs/IncomingMessageBatchTransactionCreateOrConnectWithoutTransactionInput";
import { IncomingMessageBatchTransactionCreateWithoutTransactionInput } from "../inputs/IncomingMessageBatchTransactionCreateWithoutTransactionInput";
import { IncomingMessageBatchTransactionWhereUniqueInput } from "../inputs/IncomingMessageBatchTransactionWhereUniqueInput";

@TypeGraphQL.InputType("IncomingMessageBatchTransactionCreateNestedManyWithoutTransactionInput", {})
export class IncomingMessageBatchTransactionCreateNestedManyWithoutTransactionInput {
  @TypeGraphQL.Field(_type => [IncomingMessageBatchTransactionCreateWithoutTransactionInput], {
    nullable: true
  })
  create?: IncomingMessageBatchTransactionCreateWithoutTransactionInput[] | undefined;

  @TypeGraphQL.Field(_type => [IncomingMessageBatchTransactionCreateOrConnectWithoutTransactionInput], {
    nullable: true
  })
  connectOrCreate?: IncomingMessageBatchTransactionCreateOrConnectWithoutTransactionInput[] | undefined;

  @TypeGraphQL.Field(_type => IncomingMessageBatchTransactionCreateManyTransactionInputEnvelope, {
    nullable: true
  })
  createMany?: IncomingMessageBatchTransactionCreateManyTransactionInputEnvelope | undefined;

  @TypeGraphQL.Field(_type => [IncomingMessageBatchTransactionWhereUniqueInput], {
    nullable: true
  })
  connect?: IncomingMessageBatchTransactionWhereUniqueInput[] | undefined;
}
