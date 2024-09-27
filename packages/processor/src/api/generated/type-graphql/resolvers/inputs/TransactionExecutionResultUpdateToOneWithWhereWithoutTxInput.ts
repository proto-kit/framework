import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { TransactionExecutionResultUpdateWithoutTxInput } from "../inputs/TransactionExecutionResultUpdateWithoutTxInput";
import { TransactionExecutionResultWhereInput } from "../inputs/TransactionExecutionResultWhereInput";

@TypeGraphQL.InputType("TransactionExecutionResultUpdateToOneWithWhereWithoutTxInput", {})
export class TransactionExecutionResultUpdateToOneWithWhereWithoutTxInput {
  @TypeGraphQL.Field(_type => TransactionExecutionResultWhereInput, {
    nullable: true
  })
  where?: TransactionExecutionResultWhereInput | undefined;

  @TypeGraphQL.Field(_type => TransactionExecutionResultUpdateWithoutTxInput, {
    nullable: false
  })
  data!: TransactionExecutionResultUpdateWithoutTxInput;
}
