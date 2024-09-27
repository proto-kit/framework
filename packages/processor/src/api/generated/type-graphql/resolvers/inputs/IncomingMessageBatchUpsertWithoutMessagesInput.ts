import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { IncomingMessageBatchCreateWithoutMessagesInput } from "../inputs/IncomingMessageBatchCreateWithoutMessagesInput";
import { IncomingMessageBatchUpdateWithoutMessagesInput } from "../inputs/IncomingMessageBatchUpdateWithoutMessagesInput";
import { IncomingMessageBatchWhereInput } from "../inputs/IncomingMessageBatchWhereInput";

@TypeGraphQL.InputType("IncomingMessageBatchUpsertWithoutMessagesInput", {})
export class IncomingMessageBatchUpsertWithoutMessagesInput {
  @TypeGraphQL.Field(_type => IncomingMessageBatchUpdateWithoutMessagesInput, {
    nullable: false
  })
  update!: IncomingMessageBatchUpdateWithoutMessagesInput;

  @TypeGraphQL.Field(_type => IncomingMessageBatchCreateWithoutMessagesInput, {
    nullable: false
  })
  create!: IncomingMessageBatchCreateWithoutMessagesInput;

  @TypeGraphQL.Field(_type => IncomingMessageBatchWhereInput, {
    nullable: true
  })
  where?: IncomingMessageBatchWhereInput | undefined;
}
