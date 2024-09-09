import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { TransactionExecutionResultCreateInput } from "../../../inputs/TransactionExecutionResultCreateInput";
import { TransactionExecutionResultUpdateInput } from "../../../inputs/TransactionExecutionResultUpdateInput";
import { TransactionExecutionResultWhereUniqueInput } from "../../../inputs/TransactionExecutionResultWhereUniqueInput";

@TypeGraphQL.ArgsType()
export class UpsertOneTransactionExecutionResultArgs {
  @TypeGraphQL.Field(_type => TransactionExecutionResultWhereUniqueInput, {
    nullable: false
  })
  where!: TransactionExecutionResultWhereUniqueInput;

  @TypeGraphQL.Field(_type => TransactionExecutionResultCreateInput, {
    nullable: false
  })
  create!: TransactionExecutionResultCreateInput;

  @TypeGraphQL.Field(_type => TransactionExecutionResultUpdateInput, {
    nullable: false
  })
  update!: TransactionExecutionResultUpdateInput;
}
