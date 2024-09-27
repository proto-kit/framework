import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { TransactionUpdateWithoutExecutionResultInput } from "../inputs/TransactionUpdateWithoutExecutionResultInput";
import { TransactionWhereInput } from "../inputs/TransactionWhereInput";

@TypeGraphQL.InputType("TransactionUpdateToOneWithWhereWithoutExecutionResultInput", {})
export class TransactionUpdateToOneWithWhereWithoutExecutionResultInput {
  @TypeGraphQL.Field(_type => TransactionWhereInput, {
    nullable: true
  })
  where?: TransactionWhereInput | undefined;

  @TypeGraphQL.Field(_type => TransactionUpdateWithoutExecutionResultInput, {
    nullable: false
  })
  data!: TransactionUpdateWithoutExecutionResultInput;
}
