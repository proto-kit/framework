import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { TransactionExecutionResultScalarWhereInput } from "../inputs/TransactionExecutionResultScalarWhereInput";
import { TransactionExecutionResultUpdateManyMutationInput } from "../inputs/TransactionExecutionResultUpdateManyMutationInput";

@TypeGraphQL.InputType("TransactionExecutionResultUpdateManyWithWhereWithoutBlockInput", {})
export class TransactionExecutionResultUpdateManyWithWhereWithoutBlockInput {
  @TypeGraphQL.Field(_type => TransactionExecutionResultScalarWhereInput, {
    nullable: false
  })
  where!: TransactionExecutionResultScalarWhereInput;

  @TypeGraphQL.Field(_type => TransactionExecutionResultUpdateManyMutationInput, {
    nullable: false
  })
  data!: TransactionExecutionResultUpdateManyMutationInput;
}
