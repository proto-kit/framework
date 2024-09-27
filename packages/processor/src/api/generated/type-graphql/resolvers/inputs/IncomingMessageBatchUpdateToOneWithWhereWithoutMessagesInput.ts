import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { IncomingMessageBatchUpdateWithoutMessagesInput } from "../inputs/IncomingMessageBatchUpdateWithoutMessagesInput";
import { IncomingMessageBatchWhereInput } from "../inputs/IncomingMessageBatchWhereInput";

@TypeGraphQL.InputType("IncomingMessageBatchUpdateToOneWithWhereWithoutMessagesInput", {})
export class IncomingMessageBatchUpdateToOneWithWhereWithoutMessagesInput {
  @TypeGraphQL.Field(_type => IncomingMessageBatchWhereInput, {
    nullable: true
  })
  where?: IncomingMessageBatchWhereInput | undefined;

  @TypeGraphQL.Field(_type => IncomingMessageBatchUpdateWithoutMessagesInput, {
    nullable: false
  })
  data!: IncomingMessageBatchUpdateWithoutMessagesInput;
}
