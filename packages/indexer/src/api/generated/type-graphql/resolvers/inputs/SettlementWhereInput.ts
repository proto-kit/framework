import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BatchListRelationFilter } from "../inputs/BatchListRelationFilter";
import { StringFilter } from "../inputs/StringFilter";

@TypeGraphQL.InputType("SettlementWhereInput", {})
export class SettlementWhereInput {
  @TypeGraphQL.Field(_type => [SettlementWhereInput], {
    nullable: true
  })
  AND?: SettlementWhereInput[] | undefined;

  @TypeGraphQL.Field(_type => [SettlementWhereInput], {
    nullable: true
  })
  OR?: SettlementWhereInput[] | undefined;

  @TypeGraphQL.Field(_type => [SettlementWhereInput], {
    nullable: true
  })
  NOT?: SettlementWhereInput[] | undefined;

  @TypeGraphQL.Field(_type => StringFilter, {
    nullable: true
  })
  transactionHash?: StringFilter | undefined;

  @TypeGraphQL.Field(_type => StringFilter, {
    nullable: true
  })
  promisedMessagesHash?: StringFilter | undefined;

  @TypeGraphQL.Field(_type => BatchListRelationFilter, {
    nullable: true
  })
  batches?: BatchListRelationFilter | undefined;
}
