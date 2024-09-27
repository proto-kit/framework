import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { TransactionExecutionResultCreateInput } from "../../../inputs/TransactionExecutionResultCreateInput";

@TypeGraphQL.ArgsType()
export class CreateOneTransactionExecutionResultArgs {
  @TypeGraphQL.Field(_type => TransactionExecutionResultCreateInput, {
    nullable: false
  })
  data!: TransactionExecutionResultCreateInput;
}
