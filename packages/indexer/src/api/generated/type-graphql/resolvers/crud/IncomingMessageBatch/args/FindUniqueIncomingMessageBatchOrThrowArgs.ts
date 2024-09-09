import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { IncomingMessageBatchWhereUniqueInput } from "../../../inputs/IncomingMessageBatchWhereUniqueInput";

@TypeGraphQL.ArgsType()
export class FindUniqueIncomingMessageBatchOrThrowArgs {
  @TypeGraphQL.Field(_type => IncomingMessageBatchWhereUniqueInput, {
    nullable: false
  })
  where!: IncomingMessageBatchWhereUniqueInput;
}
