import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { TransactionExecutionResultWhereInput } from "../inputs/TransactionExecutionResultWhereInput";

@TypeGraphQL.InputType("TransactionExecutionResultNullableRelationFilter", {})
export class TransactionExecutionResultNullableRelationFilter {
  @TypeGraphQL.Field(_type => TransactionExecutionResultWhereInput, {
    nullable: true
  })
  is?: TransactionExecutionResultWhereInput | undefined;

  @TypeGraphQL.Field(_type => TransactionExecutionResultWhereInput, {
    nullable: true
  })
  isNot?: TransactionExecutionResultWhereInput | undefined;
}
