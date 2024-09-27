import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { TransactionExecutionResultUpdateManyMutationInput } from "../../../inputs/TransactionExecutionResultUpdateManyMutationInput";
import { TransactionExecutionResultWhereInput } from "../../../inputs/TransactionExecutionResultWhereInput";

@TypeGraphQL.ArgsType()
export class UpdateManyTransactionExecutionResultArgs {
  @TypeGraphQL.Field(_type => TransactionExecutionResultUpdateManyMutationInput, {
    nullable: false
  })
  data!: TransactionExecutionResultUpdateManyMutationInput;

  @TypeGraphQL.Field(_type => TransactionExecutionResultWhereInput, {
    nullable: true
  })
  where?: TransactionExecutionResultWhereInput | undefined;
}
