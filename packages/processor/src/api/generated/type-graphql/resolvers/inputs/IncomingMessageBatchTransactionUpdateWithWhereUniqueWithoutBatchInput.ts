import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { IncomingMessageBatchTransactionUpdateWithoutBatchInput } from "../inputs/IncomingMessageBatchTransactionUpdateWithoutBatchInput";
import { IncomingMessageBatchTransactionWhereUniqueInput } from "../inputs/IncomingMessageBatchTransactionWhereUniqueInput";

@TypeGraphQL.InputType("IncomingMessageBatchTransactionUpdateWithWhereUniqueWithoutBatchInput", {})
export class IncomingMessageBatchTransactionUpdateWithWhereUniqueWithoutBatchInput {
  @TypeGraphQL.Field(_type => IncomingMessageBatchTransactionWhereUniqueInput, {
    nullable: false
  })
  where!: IncomingMessageBatchTransactionWhereUniqueInput;

  @TypeGraphQL.Field(_type => IncomingMessageBatchTransactionUpdateWithoutBatchInput, {
    nullable: false
  })
  data!: IncomingMessageBatchTransactionUpdateWithoutBatchInput;
}
