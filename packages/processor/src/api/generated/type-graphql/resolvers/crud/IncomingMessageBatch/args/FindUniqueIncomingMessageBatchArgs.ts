import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { IncomingMessageBatchWhereUniqueInput } from "../../../inputs/IncomingMessageBatchWhereUniqueInput";

@TypeGraphQL.ArgsType()
export class FindUniqueIncomingMessageBatchArgs {
  @TypeGraphQL.Field(_type => IncomingMessageBatchWhereUniqueInput, {
    nullable: false
  })
  where!: IncomingMessageBatchWhereUniqueInput;
}
