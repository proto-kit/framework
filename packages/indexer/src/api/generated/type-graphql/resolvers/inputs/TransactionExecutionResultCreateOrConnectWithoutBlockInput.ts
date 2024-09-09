import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { TransactionExecutionResultCreateWithoutBlockInput } from "../inputs/TransactionExecutionResultCreateWithoutBlockInput";
import { TransactionExecutionResultWhereUniqueInput } from "../inputs/TransactionExecutionResultWhereUniqueInput";

@TypeGraphQL.InputType("TransactionExecutionResultCreateOrConnectWithoutBlockInput", {})
export class TransactionExecutionResultCreateOrConnectWithoutBlockInput {
  @TypeGraphQL.Field(_type => TransactionExecutionResultWhereUniqueInput, {
    nullable: false
  })
  where!: TransactionExecutionResultWhereUniqueInput;

  @TypeGraphQL.Field(_type => TransactionExecutionResultCreateWithoutBlockInput, {
    nullable: false
  })
  create!: TransactionExecutionResultCreateWithoutBlockInput;
}
