import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { IncomingMessageBatchCreateWithoutMessagesInput } from "../inputs/IncomingMessageBatchCreateWithoutMessagesInput";
import { IncomingMessageBatchWhereUniqueInput } from "../inputs/IncomingMessageBatchWhereUniqueInput";

@TypeGraphQL.InputType("IncomingMessageBatchCreateOrConnectWithoutMessagesInput", {})
export class IncomingMessageBatchCreateOrConnectWithoutMessagesInput {
  @TypeGraphQL.Field(_type => IncomingMessageBatchWhereUniqueInput, {
    nullable: false
  })
  where!: IncomingMessageBatchWhereUniqueInput;

  @TypeGraphQL.Field(_type => IncomingMessageBatchCreateWithoutMessagesInput, {
    nullable: false
  })
  create!: IncomingMessageBatchCreateWithoutMessagesInput;
}
