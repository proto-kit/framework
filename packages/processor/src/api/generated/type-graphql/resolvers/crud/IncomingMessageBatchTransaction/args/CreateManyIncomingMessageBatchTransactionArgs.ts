import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { IncomingMessageBatchTransactionCreateManyInput } from "../../../inputs/IncomingMessageBatchTransactionCreateManyInput";

@TypeGraphQL.ArgsType()
export class CreateManyIncomingMessageBatchTransactionArgs {
  @TypeGraphQL.Field(_type => [IncomingMessageBatchTransactionCreateManyInput], {
    nullable: false
  })
  data!: IncomingMessageBatchTransactionCreateManyInput[];

  @TypeGraphQL.Field(_type => Boolean, {
    nullable: true
  })
  skipDuplicates?: boolean | undefined;
}
