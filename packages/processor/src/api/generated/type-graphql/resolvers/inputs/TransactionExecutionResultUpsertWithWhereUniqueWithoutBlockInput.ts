import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { TransactionExecutionResultCreateWithoutBlockInput } from "../inputs/TransactionExecutionResultCreateWithoutBlockInput";
import { TransactionExecutionResultUpdateWithoutBlockInput } from "../inputs/TransactionExecutionResultUpdateWithoutBlockInput";
import { TransactionExecutionResultWhereUniqueInput } from "../inputs/TransactionExecutionResultWhereUniqueInput";

@TypeGraphQL.InputType("TransactionExecutionResultUpsertWithWhereUniqueWithoutBlockInput", {})
export class TransactionExecutionResultUpsertWithWhereUniqueWithoutBlockInput {
  @TypeGraphQL.Field(_type => TransactionExecutionResultWhereUniqueInput, {
    nullable: false
  })
  where!: TransactionExecutionResultWhereUniqueInput;

  @TypeGraphQL.Field(_type => TransactionExecutionResultUpdateWithoutBlockInput, {
    nullable: false
  })
  update!: TransactionExecutionResultUpdateWithoutBlockInput;

  @TypeGraphQL.Field(_type => TransactionExecutionResultCreateWithoutBlockInput, {
    nullable: false
  })
  create!: TransactionExecutionResultCreateWithoutBlockInput;
}
