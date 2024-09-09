import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { TransactionExecutionResultCreateOrConnectWithoutTxInput } from "../inputs/TransactionExecutionResultCreateOrConnectWithoutTxInput";
import { TransactionExecutionResultCreateWithoutTxInput } from "../inputs/TransactionExecutionResultCreateWithoutTxInput";
import { TransactionExecutionResultUpdateToOneWithWhereWithoutTxInput } from "../inputs/TransactionExecutionResultUpdateToOneWithWhereWithoutTxInput";
import { TransactionExecutionResultUpsertWithoutTxInput } from "../inputs/TransactionExecutionResultUpsertWithoutTxInput";
import { TransactionExecutionResultWhereInput } from "../inputs/TransactionExecutionResultWhereInput";
import { TransactionExecutionResultWhereUniqueInput } from "../inputs/TransactionExecutionResultWhereUniqueInput";

@TypeGraphQL.InputType("TransactionExecutionResultUpdateOneWithoutTxNestedInput", {})
export class TransactionExecutionResultUpdateOneWithoutTxNestedInput {
  @TypeGraphQL.Field(_type => TransactionExecutionResultCreateWithoutTxInput, {
    nullable: true
  })
  create?: TransactionExecutionResultCreateWithoutTxInput | undefined;

  @TypeGraphQL.Field(_type => TransactionExecutionResultCreateOrConnectWithoutTxInput, {
    nullable: true
  })
  connectOrCreate?: TransactionExecutionResultCreateOrConnectWithoutTxInput | undefined;

  @TypeGraphQL.Field(_type => TransactionExecutionResultUpsertWithoutTxInput, {
    nullable: true
  })
  upsert?: TransactionExecutionResultUpsertWithoutTxInput | undefined;

  @TypeGraphQL.Field(_type => TransactionExecutionResultWhereInput, {
    nullable: true
  })
  disconnect?: TransactionExecutionResultWhereInput | undefined;

  @TypeGraphQL.Field(_type => TransactionExecutionResultWhereInput, {
    nullable: true
  })
  delete?: TransactionExecutionResultWhereInput | undefined;

  @TypeGraphQL.Field(_type => TransactionExecutionResultWhereUniqueInput, {
    nullable: true
  })
  connect?: TransactionExecutionResultWhereUniqueInput | undefined;

  @TypeGraphQL.Field(_type => TransactionExecutionResultUpdateToOneWithWhereWithoutTxInput, {
    nullable: true
  })
  update?: TransactionExecutionResultUpdateToOneWithWhereWithoutTxInput | undefined;
}
