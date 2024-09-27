import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { TransactionExecutionResultCreateManyInput } from "../../../inputs/TransactionExecutionResultCreateManyInput";

@TypeGraphQL.ArgsType()
export class CreateManyTransactionExecutionResultArgs {
  @TypeGraphQL.Field(_type => [TransactionExecutionResultCreateManyInput], {
    nullable: false
  })
  data!: TransactionExecutionResultCreateManyInput[];

  @TypeGraphQL.Field(_type => Boolean, {
    nullable: true
  })
  skipDuplicates?: boolean | undefined;
}
