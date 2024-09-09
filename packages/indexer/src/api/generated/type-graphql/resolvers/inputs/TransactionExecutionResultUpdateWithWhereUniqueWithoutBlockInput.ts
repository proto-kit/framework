import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { TransactionExecutionResultUpdateWithoutBlockInput } from "../inputs/TransactionExecutionResultUpdateWithoutBlockInput";
import { TransactionExecutionResultWhereUniqueInput } from "../inputs/TransactionExecutionResultWhereUniqueInput";

@TypeGraphQL.InputType("TransactionExecutionResultUpdateWithWhereUniqueWithoutBlockInput", {})
export class TransactionExecutionResultUpdateWithWhereUniqueWithoutBlockInput {
  @TypeGraphQL.Field(_type => TransactionExecutionResultWhereUniqueInput, {
    nullable: false
  })
  where!: TransactionExecutionResultWhereUniqueInput;

  @TypeGraphQL.Field(_type => TransactionExecutionResultUpdateWithoutBlockInput, {
    nullable: false
  })
  data!: TransactionExecutionResultUpdateWithoutBlockInput;
}
