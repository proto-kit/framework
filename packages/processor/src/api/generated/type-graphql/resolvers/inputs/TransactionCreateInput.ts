import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { IncomingMessageBatchTransactionCreateNestedManyWithoutTransactionInput } from "../inputs/IncomingMessageBatchTransactionCreateNestedManyWithoutTransactionInput";
import { TransactionCreateargsFieldsInput } from "../inputs/TransactionCreateargsFieldsInput";
import { TransactionCreateauxiliaryDataInput } from "../inputs/TransactionCreateauxiliaryDataInput";
import { TransactionExecutionResultCreateNestedOneWithoutTxInput } from "../inputs/TransactionExecutionResultCreateNestedOneWithoutTxInput";

@TypeGraphQL.InputType("TransactionCreateInput", {})
export class TransactionCreateInput {
  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  hash!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  methodId!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  sender!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  nonce!: string;

  @TypeGraphQL.Field(_type => TransactionCreateargsFieldsInput, {
    nullable: true
  })
  argsFields?: TransactionCreateargsFieldsInput | undefined;

  @TypeGraphQL.Field(_type => TransactionCreateauxiliaryDataInput, {
    nullable: true
  })
  auxiliaryData?: TransactionCreateauxiliaryDataInput | undefined;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  signature_r!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  signature_s!: string;

  @TypeGraphQL.Field(_type => Boolean, {
    nullable: false
  })
  isMessage!: boolean;

  @TypeGraphQL.Field(_type => TransactionExecutionResultCreateNestedOneWithoutTxInput, {
    nullable: true
  })
  executionResult?: TransactionExecutionResultCreateNestedOneWithoutTxInput | undefined;

  @TypeGraphQL.Field(_type => IncomingMessageBatchTransactionCreateNestedManyWithoutTransactionInput, {
    nullable: true
  })
  IncomingMessageBatchTransaction?: IncomingMessageBatchTransactionCreateNestedManyWithoutTransactionInput | undefined;
}
