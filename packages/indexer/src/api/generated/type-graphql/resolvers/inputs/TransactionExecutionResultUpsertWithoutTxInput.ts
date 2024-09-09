import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { TransactionExecutionResultCreateWithoutTxInput } from "../inputs/TransactionExecutionResultCreateWithoutTxInput";
import { TransactionExecutionResultUpdateWithoutTxInput } from "../inputs/TransactionExecutionResultUpdateWithoutTxInput";
import { TransactionExecutionResultWhereInput } from "../inputs/TransactionExecutionResultWhereInput";

@TypeGraphQL.InputType("TransactionExecutionResultUpsertWithoutTxInput", {})
export class TransactionExecutionResultUpsertWithoutTxInput {
  @TypeGraphQL.Field(_type => TransactionExecutionResultUpdateWithoutTxInput, {
    nullable: false
  })
  update!: TransactionExecutionResultUpdateWithoutTxInput;

  @TypeGraphQL.Field(_type => TransactionExecutionResultCreateWithoutTxInput, {
    nullable: false
  })
  create!: TransactionExecutionResultCreateWithoutTxInput;

  @TypeGraphQL.Field(_type => TransactionExecutionResultWhereInput, {
    nullable: true
  })
  where?: TransactionExecutionResultWhereInput | undefined;
}
