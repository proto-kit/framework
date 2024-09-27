import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { TransactionCreateOrConnectWithoutExecutionResultInput } from "../inputs/TransactionCreateOrConnectWithoutExecutionResultInput";
import { TransactionCreateWithoutExecutionResultInput } from "../inputs/TransactionCreateWithoutExecutionResultInput";
import { TransactionWhereUniqueInput } from "../inputs/TransactionWhereUniqueInput";

@TypeGraphQL.InputType("TransactionCreateNestedOneWithoutExecutionResultInput", {})
export class TransactionCreateNestedOneWithoutExecutionResultInput {
  @TypeGraphQL.Field(_type => TransactionCreateWithoutExecutionResultInput, {
    nullable: true
  })
  create?: TransactionCreateWithoutExecutionResultInput | undefined;

  @TypeGraphQL.Field(_type => TransactionCreateOrConnectWithoutExecutionResultInput, {
    nullable: true
  })
  connectOrCreate?: TransactionCreateOrConnectWithoutExecutionResultInput | undefined;

  @TypeGraphQL.Field(_type => TransactionWhereUniqueInput, {
    nullable: true
  })
  connect?: TransactionWhereUniqueInput | undefined;
}
