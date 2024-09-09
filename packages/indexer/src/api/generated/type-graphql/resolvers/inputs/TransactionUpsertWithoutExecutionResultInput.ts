import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { TransactionCreateWithoutExecutionResultInput } from "../inputs/TransactionCreateWithoutExecutionResultInput";
import { TransactionUpdateWithoutExecutionResultInput } from "../inputs/TransactionUpdateWithoutExecutionResultInput";
import { TransactionWhereInput } from "../inputs/TransactionWhereInput";

@TypeGraphQL.InputType("TransactionUpsertWithoutExecutionResultInput", {})
export class TransactionUpsertWithoutExecutionResultInput {
  @TypeGraphQL.Field(_type => TransactionUpdateWithoutExecutionResultInput, {
    nullable: false
  })
  update!: TransactionUpdateWithoutExecutionResultInput;

  @TypeGraphQL.Field(_type => TransactionCreateWithoutExecutionResultInput, {
    nullable: false
  })
  create!: TransactionCreateWithoutExecutionResultInput;

  @TypeGraphQL.Field(_type => TransactionWhereInput, {
    nullable: true
  })
  where?: TransactionWhereInput | undefined;
}
