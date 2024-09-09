import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { TransactionExecutionResultCreateWithoutTxInput } from "../inputs/TransactionExecutionResultCreateWithoutTxInput";
import { TransactionExecutionResultWhereUniqueInput } from "../inputs/TransactionExecutionResultWhereUniqueInput";

@TypeGraphQL.InputType("TransactionExecutionResultCreateOrConnectWithoutTxInput", {})
export class TransactionExecutionResultCreateOrConnectWithoutTxInput {
  @TypeGraphQL.Field(_type => TransactionExecutionResultWhereUniqueInput, {
    nullable: false
  })
  where!: TransactionExecutionResultWhereUniqueInput;

  @TypeGraphQL.Field(_type => TransactionExecutionResultCreateWithoutTxInput, {
    nullable: false
  })
  create!: TransactionExecutionResultCreateWithoutTxInput;
}
