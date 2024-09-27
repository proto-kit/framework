import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { IntFilter } from "../inputs/IntFilter";
import { JsonFilter } from "../inputs/JsonFilter";
import { StringNullableFilter } from "../inputs/StringNullableFilter";

@TypeGraphQL.InputType("BatchScalarWhereInput", {})
export class BatchScalarWhereInput {
  @TypeGraphQL.Field(_type => [BatchScalarWhereInput], {
    nullable: true
  })
  AND?: BatchScalarWhereInput[] | undefined;

  @TypeGraphQL.Field(_type => [BatchScalarWhereInput], {
    nullable: true
  })
  OR?: BatchScalarWhereInput[] | undefined;

  @TypeGraphQL.Field(_type => [BatchScalarWhereInput], {
    nullable: true
  })
  NOT?: BatchScalarWhereInput[] | undefined;

  @TypeGraphQL.Field(_type => IntFilter, {
    nullable: true
  })
  height?: IntFilter | undefined;

  @TypeGraphQL.Field(_type => JsonFilter, {
    nullable: true
  })
  proof?: JsonFilter | undefined;

  @TypeGraphQL.Field(_type => StringNullableFilter, {
    nullable: true
  })
  settlementTransactionHash?: StringNullableFilter | undefined;
}
