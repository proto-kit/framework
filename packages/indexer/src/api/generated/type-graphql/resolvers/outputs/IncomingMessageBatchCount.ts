import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { IncomingMessageBatchCountMessagesArgs } from "./args/IncomingMessageBatchCountMessagesArgs";

@TypeGraphQL.ObjectType("IncomingMessageBatchCount", {})
export class IncomingMessageBatchCount {
  messages!: number;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    name: "messages",
    nullable: false
  })
  getMessages(@TypeGraphQL.Root() root: IncomingMessageBatchCount, @TypeGraphQL.Args() args: IncomingMessageBatchCountMessagesArgs): number {
    return root.messages;
  }
}
