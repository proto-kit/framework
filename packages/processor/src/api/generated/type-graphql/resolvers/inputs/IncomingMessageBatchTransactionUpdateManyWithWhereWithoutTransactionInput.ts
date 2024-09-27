import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { IncomingMessageBatchTransactionScalarWhereInput } from "../inputs/IncomingMessageBatchTransactionScalarWhereInput";
import { IncomingMessageBatchTransactionUpdateManyMutationInput } from "../inputs/IncomingMessageBatchTransactionUpdateManyMutationInput";

@TypeGraphQL.InputType("IncomingMessageBatchTransactionUpdateManyWithWhereWithoutTransactionInput", {})
export class IncomingMessageBatchTransactionUpdateManyWithWhereWithoutTransactionInput {
  @TypeGraphQL.Field(_type => IncomingMessageBatchTransactionScalarWhereInput, {
    nullable: false
  })
  where!: IncomingMessageBatchTransactionScalarWhereInput;

  @TypeGraphQL.Field(_type => IncomingMessageBatchTransactionUpdateManyMutationInput, {
    nullable: false
  })
  data!: IncomingMessageBatchTransactionUpdateManyMutationInput;
}
