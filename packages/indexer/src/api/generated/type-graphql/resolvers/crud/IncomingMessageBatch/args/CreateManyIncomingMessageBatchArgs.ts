import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { IncomingMessageBatchCreateManyInput } from "../../../inputs/IncomingMessageBatchCreateManyInput";

@TypeGraphQL.ArgsType()
export class CreateManyIncomingMessageBatchArgs {
  @TypeGraphQL.Field(_type => [IncomingMessageBatchCreateManyInput], {
    nullable: false
  })
  data!: IncomingMessageBatchCreateManyInput[];

  @TypeGraphQL.Field(_type => Boolean, {
    nullable: true
  })
  skipDuplicates?: boolean | undefined;
}
