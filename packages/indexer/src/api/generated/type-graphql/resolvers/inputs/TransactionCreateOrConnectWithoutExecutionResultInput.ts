import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { TransactionCreateWithoutExecutionResultInput } from "../inputs/TransactionCreateWithoutExecutionResultInput";
import { TransactionWhereUniqueInput } from "../inputs/TransactionWhereUniqueInput";

@TypeGraphQL.InputType("TransactionCreateOrConnectWithoutExecutionResultInput", {})
export class TransactionCreateOrConnectWithoutExecutionResultInput {
  @TypeGraphQL.Field(_type => TransactionWhereUniqueInput, {
    nullable: false
  })
  where!: TransactionWhereUniqueInput;

  @TypeGraphQL.Field(_type => TransactionCreateWithoutExecutionResultInput, {
    nullable: false
  })
  create!: TransactionCreateWithoutExecutionResultInput;
}
