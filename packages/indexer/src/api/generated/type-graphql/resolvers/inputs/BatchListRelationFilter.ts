import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BatchWhereInput } from "../inputs/BatchWhereInput";

@TypeGraphQL.InputType("BatchListRelationFilter", {})
export class BatchListRelationFilter {
  @TypeGraphQL.Field(_type => BatchWhereInput, {
    nullable: true
  })
  every?: BatchWhereInput | undefined;

  @TypeGraphQL.Field(_type => BatchWhereInput, {
    nullable: true
  })
  some?: BatchWhereInput | undefined;

  @TypeGraphQL.Field(_type => BatchWhereInput, {
    nullable: true
  })
  none?: BatchWhereInput | undefined;
}
