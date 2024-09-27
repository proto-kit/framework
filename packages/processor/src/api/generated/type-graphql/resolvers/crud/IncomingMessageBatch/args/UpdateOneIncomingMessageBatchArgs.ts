import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { IncomingMessageBatchUpdateInput } from "../../../inputs/IncomingMessageBatchUpdateInput";
import { IncomingMessageBatchWhereUniqueInput } from "../../../inputs/IncomingMessageBatchWhereUniqueInput";

@TypeGraphQL.ArgsType()
export class UpdateOneIncomingMessageBatchArgs {
  @TypeGraphQL.Field(_type => IncomingMessageBatchUpdateInput, {
    nullable: false
  })
  data!: IncomingMessageBatchUpdateInput;

  @TypeGraphQL.Field(_type => IncomingMessageBatchWhereUniqueInput, {
    nullable: false
  })
  where!: IncomingMessageBatchWhereUniqueInput;
}
