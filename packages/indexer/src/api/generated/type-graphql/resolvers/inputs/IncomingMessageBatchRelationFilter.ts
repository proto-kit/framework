import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { IncomingMessageBatchWhereInput } from "../inputs/IncomingMessageBatchWhereInput";

@TypeGraphQL.InputType("IncomingMessageBatchRelationFilter", {})
export class IncomingMessageBatchRelationFilter {
  @TypeGraphQL.Field(_type => IncomingMessageBatchWhereInput, {
    nullable: true
  })
  is?: IncomingMessageBatchWhereInput | undefined;

  @TypeGraphQL.Field(_type => IncomingMessageBatchWhereInput, {
    nullable: true
  })
  isNot?: IncomingMessageBatchWhereInput | undefined;
}
