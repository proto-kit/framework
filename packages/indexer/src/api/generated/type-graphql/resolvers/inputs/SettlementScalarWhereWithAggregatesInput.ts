import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { StringWithAggregatesFilter } from "../inputs/StringWithAggregatesFilter";

@TypeGraphQL.InputType("SettlementScalarWhereWithAggregatesInput", {})
export class SettlementScalarWhereWithAggregatesInput {
  @TypeGraphQL.Field(_type => [SettlementScalarWhereWithAggregatesInput], {
    nullable: true
  })
  AND?: SettlementScalarWhereWithAggregatesInput[] | undefined;

  @TypeGraphQL.Field(_type => [SettlementScalarWhereWithAggregatesInput], {
    nullable: true
  })
  OR?: SettlementScalarWhereWithAggregatesInput[] | undefined;

  @TypeGraphQL.Field(_type => [SettlementScalarWhereWithAggregatesInput], {
    nullable: true
  })
  NOT?: SettlementScalarWhereWithAggregatesInput[] | undefined;

  @TypeGraphQL.Field(_type => StringWithAggregatesFilter, {
    nullable: true
  })
  transactionHash?: StringWithAggregatesFilter | undefined;

  @TypeGraphQL.Field(_type => StringWithAggregatesFilter, {
    nullable: true
  })
  promisedMessagesHash?: StringWithAggregatesFilter | undefined;
}
