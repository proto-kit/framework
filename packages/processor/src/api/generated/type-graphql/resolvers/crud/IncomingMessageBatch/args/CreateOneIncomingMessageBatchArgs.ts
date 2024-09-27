import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { IncomingMessageBatchCreateInput } from "../../../inputs/IncomingMessageBatchCreateInput";

@TypeGraphQL.ArgsType()
export class CreateOneIncomingMessageBatchArgs {
  @TypeGraphQL.Field(_type => IncomingMessageBatchCreateInput, {
    nullable: false
  })
  data!: IncomingMessageBatchCreateInput;
}
