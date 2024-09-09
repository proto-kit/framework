import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { TransactionCreateOrConnectWithoutExecutionResultInput } from "../inputs/TransactionCreateOrConnectWithoutExecutionResultInput";
import { TransactionCreateWithoutExecutionResultInput } from "../inputs/TransactionCreateWithoutExecutionResultInput";
import { TransactionUpdateToOneWithWhereWithoutExecutionResultInput } from "../inputs/TransactionUpdateToOneWithWhereWithoutExecutionResultInput";
import { TransactionUpsertWithoutExecutionResultInput } from "../inputs/TransactionUpsertWithoutExecutionResultInput";
import { TransactionWhereUniqueInput } from "../inputs/TransactionWhereUniqueInput";

@TypeGraphQL.InputType("TransactionUpdateOneRequiredWithoutExecutionResultNestedInput", {})
export class TransactionUpdateOneRequiredWithoutExecutionResultNestedInput {
  @TypeGraphQL.Field(_type => TransactionCreateWithoutExecutionResultInput, {
    nullable: true
  })
  create?: TransactionCreateWithoutExecutionResultInput | undefined;

  @TypeGraphQL.Field(_type => TransactionCreateOrConnectWithoutExecutionResultInput, {
    nullable: true
  })
  connectOrCreate?: TransactionCreateOrConnectWithoutExecutionResultInput | undefined;

  @TypeGraphQL.Field(_type => TransactionUpsertWithoutExecutionResultInput, {
    nullable: true
  })
  upsert?: TransactionUpsertWithoutExecutionResultInput | undefined;

  @TypeGraphQL.Field(_type => TransactionWhereUniqueInput, {
    nullable: true
  })
  connect?: TransactionWhereUniqueInput | undefined;

  @TypeGraphQL.Field(_type => TransactionUpdateToOneWithWhereWithoutExecutionResultInput, {
    nullable: true
  })
  update?: TransactionUpdateToOneWithWhereWithoutExecutionResultInput | undefined;
}
