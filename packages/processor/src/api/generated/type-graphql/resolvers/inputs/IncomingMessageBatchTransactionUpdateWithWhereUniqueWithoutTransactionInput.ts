import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { IncomingMessageBatchTransactionUpdateWithoutTransactionInput } from "../inputs/IncomingMessageBatchTransactionUpdateWithoutTransactionInput";
import { IncomingMessageBatchTransactionWhereUniqueInput } from "../inputs/IncomingMessageBatchTransactionWhereUniqueInput";

@TypeGraphQL.InputType("IncomingMessageBatchTransactionUpdateWithWhereUniqueWithoutTransactionInput", {})
export class IncomingMessageBatchTransactionUpdateWithWhereUniqueWithoutTransactionInput {
  @TypeGraphQL.Field(_type => IncomingMessageBatchTransactionWhereUniqueInput, {
    nullable: false
  })
  where!: IncomingMessageBatchTransactionWhereUniqueInput;

  @TypeGraphQL.Field(_type => IncomingMessageBatchTransactionUpdateWithoutTransactionInput, {
    nullable: false
  })
  data!: IncomingMessageBatchTransactionUpdateWithoutTransactionInput;
}
