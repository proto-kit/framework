import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { TransactionExecutionResultWhereInput } from "../inputs/TransactionExecutionResultWhereInput";

@TypeGraphQL.InputType("TransactionExecutionResultListRelationFilter", {})
export class TransactionExecutionResultListRelationFilter {
  @TypeGraphQL.Field(_type => TransactionExecutionResultWhereInput, {
    nullable: true
  })
  every?: TransactionExecutionResultWhereInput | undefined;

  @TypeGraphQL.Field(_type => TransactionExecutionResultWhereInput, {
    nullable: true
  })
  some?: TransactionExecutionResultWhereInput | undefined;

  @TypeGraphQL.Field(_type => TransactionExecutionResultWhereInput, {
    nullable: true
  })
  none?: TransactionExecutionResultWhereInput | undefined;
}
