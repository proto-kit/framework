import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { TransactionExecutionResultWhereUniqueInput } from "../../../inputs/TransactionExecutionResultWhereUniqueInput";

@TypeGraphQL.ArgsType()
export class DeleteOneTransactionExecutionResultArgs {
  @TypeGraphQL.Field(_type => TransactionExecutionResultWhereUniqueInput, {
    nullable: false
  })
  where!: TransactionExecutionResultWhereUniqueInput;
}
