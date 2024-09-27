import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { IncomingMessageBatchTransactionCreateNestedManyWithoutBatchInput } from "../inputs/IncomingMessageBatchTransactionCreateNestedManyWithoutBatchInput";

@TypeGraphQL.InputType("IncomingMessageBatchCreateInput", {})
export class IncomingMessageBatchCreateInput {
  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  fromMessageHash!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  toMessageHash!: string;

  @TypeGraphQL.Field(_type => IncomingMessageBatchTransactionCreateNestedManyWithoutBatchInput, {
    nullable: true
  })
  messages?: IncomingMessageBatchTransactionCreateNestedManyWithoutBatchInput | undefined;
}
