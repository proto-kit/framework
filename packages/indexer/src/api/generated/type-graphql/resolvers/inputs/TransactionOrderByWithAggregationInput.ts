import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { TransactionCountOrderByAggregateInput } from "../inputs/TransactionCountOrderByAggregateInput";
import { TransactionMaxOrderByAggregateInput } from "../inputs/TransactionMaxOrderByAggregateInput";
import { TransactionMinOrderByAggregateInput } from "../inputs/TransactionMinOrderByAggregateInput";
import { SortOrder } from "../../enums/SortOrder";

@TypeGraphQL.InputType("TransactionOrderByWithAggregationInput", {})
export class TransactionOrderByWithAggregationInput {
  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  hash?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  methodId?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  sender?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  nonce?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  argsFields?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  auxiliaryData?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  signature_r?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  signature_s?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  isMessage?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => TransactionCountOrderByAggregateInput, {
    nullable: true
  })
  _count?: TransactionCountOrderByAggregateInput | undefined;

  @TypeGraphQL.Field(_type => TransactionMaxOrderByAggregateInput, {
    nullable: true
  })
  _max?: TransactionMaxOrderByAggregateInput | undefined;

  @TypeGraphQL.Field(_type => TransactionMinOrderByAggregateInput, {
    nullable: true
  })
  _min?: TransactionMinOrderByAggregateInput | undefined;
}
