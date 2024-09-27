import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { TransactionExecutionResultUpdateInput } from "../../../inputs/TransactionExecutionResultUpdateInput";
import { TransactionExecutionResultWhereUniqueInput } from "../../../inputs/TransactionExecutionResultWhereUniqueInput";

@TypeGraphQL.ArgsType()
export class UpdateOneTransactionExecutionResultArgs {
  @TypeGraphQL.Field(_type => TransactionExecutionResultUpdateInput, {
    nullable: false
  })
  data!: TransactionExecutionResultUpdateInput;

  @TypeGraphQL.Field(_type => TransactionExecutionResultWhereUniqueInput, {
    nullable: false
  })
  where!: TransactionExecutionResultWhereUniqueInput;
}
