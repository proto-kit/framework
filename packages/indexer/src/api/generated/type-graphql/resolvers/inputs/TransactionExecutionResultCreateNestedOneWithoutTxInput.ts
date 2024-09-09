import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { TransactionExecutionResultCreateOrConnectWithoutTxInput } from "../inputs/TransactionExecutionResultCreateOrConnectWithoutTxInput";
import { TransactionExecutionResultCreateWithoutTxInput } from "../inputs/TransactionExecutionResultCreateWithoutTxInput";
import { TransactionExecutionResultWhereUniqueInput } from "../inputs/TransactionExecutionResultWhereUniqueInput";

@TypeGraphQL.InputType("TransactionExecutionResultCreateNestedOneWithoutTxInput", {})
export class TransactionExecutionResultCreateNestedOneWithoutTxInput {
  @TypeGraphQL.Field(_type => TransactionExecutionResultCreateWithoutTxInput, {
    nullable: true
  })
  create?: TransactionExecutionResultCreateWithoutTxInput | undefined;

  @TypeGraphQL.Field(_type => TransactionExecutionResultCreateOrConnectWithoutTxInput, {
    nullable: true
  })
  connectOrCreate?: TransactionExecutionResultCreateOrConnectWithoutTxInput | undefined;

  @TypeGraphQL.Field(_type => TransactionExecutionResultWhereUniqueInput, {
    nullable: true
  })
  connect?: TransactionExecutionResultWhereUniqueInput | undefined;
}
