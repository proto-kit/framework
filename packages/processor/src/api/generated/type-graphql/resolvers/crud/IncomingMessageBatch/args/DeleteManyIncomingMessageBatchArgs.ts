import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { IncomingMessageBatchWhereInput } from "../../../inputs/IncomingMessageBatchWhereInput";

@TypeGraphQL.ArgsType()
export class DeleteManyIncomingMessageBatchArgs {
  @TypeGraphQL.Field(_type => IncomingMessageBatchWhereInput, {
    nullable: true
  })
  where?: IncomingMessageBatchWhereInput | undefined;
}
