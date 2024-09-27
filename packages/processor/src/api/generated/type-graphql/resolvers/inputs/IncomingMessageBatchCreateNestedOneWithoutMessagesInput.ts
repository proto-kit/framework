import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { IncomingMessageBatchCreateOrConnectWithoutMessagesInput } from "../inputs/IncomingMessageBatchCreateOrConnectWithoutMessagesInput";
import { IncomingMessageBatchCreateWithoutMessagesInput } from "../inputs/IncomingMessageBatchCreateWithoutMessagesInput";
import { IncomingMessageBatchWhereUniqueInput } from "../inputs/IncomingMessageBatchWhereUniqueInput";

@TypeGraphQL.InputType("IncomingMessageBatchCreateNestedOneWithoutMessagesInput", {})
export class IncomingMessageBatchCreateNestedOneWithoutMessagesInput {
  @TypeGraphQL.Field(_type => IncomingMessageBatchCreateWithoutMessagesInput, {
    nullable: true
  })
  create?: IncomingMessageBatchCreateWithoutMessagesInput | undefined;

  @TypeGraphQL.Field(_type => IncomingMessageBatchCreateOrConnectWithoutMessagesInput, {
    nullable: true
  })
  connectOrCreate?: IncomingMessageBatchCreateOrConnectWithoutMessagesInput | undefined;

  @TypeGraphQL.Field(_type => IncomingMessageBatchWhereUniqueInput, {
    nullable: true
  })
  connect?: IncomingMessageBatchWhereUniqueInput | undefined;
}
