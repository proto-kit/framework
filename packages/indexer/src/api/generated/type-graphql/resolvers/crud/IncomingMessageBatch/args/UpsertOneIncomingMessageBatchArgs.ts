import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { IncomingMessageBatchCreateInput } from "../../../inputs/IncomingMessageBatchCreateInput";
import { IncomingMessageBatchUpdateInput } from "../../../inputs/IncomingMessageBatchUpdateInput";
import { IncomingMessageBatchWhereUniqueInput } from "../../../inputs/IncomingMessageBatchWhereUniqueInput";

@TypeGraphQL.ArgsType()
export class UpsertOneIncomingMessageBatchArgs {
  @TypeGraphQL.Field(_type => IncomingMessageBatchWhereUniqueInput, {
    nullable: false
  })
  where!: IncomingMessageBatchWhereUniqueInput;

  @TypeGraphQL.Field(_type => IncomingMessageBatchCreateInput, {
    nullable: false
  })
  create!: IncomingMessageBatchCreateInput;

  @TypeGraphQL.Field(_type => IncomingMessageBatchUpdateInput, {
    nullable: false
  })
  update!: IncomingMessageBatchUpdateInput;
}
