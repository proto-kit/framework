import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BatchWhereInput } from "../inputs/BatchWhereInput";

@TypeGraphQL.InputType("BatchNullableRelationFilter", {})
export class BatchNullableRelationFilter {
  @TypeGraphQL.Field(_type => BatchWhereInput, {
    nullable: true
  })
  is?: BatchWhereInput | undefined;

  @TypeGraphQL.Field(_type => BatchWhereInput, {
    nullable: true
  })
  isNot?: BatchWhereInput | undefined;
}
