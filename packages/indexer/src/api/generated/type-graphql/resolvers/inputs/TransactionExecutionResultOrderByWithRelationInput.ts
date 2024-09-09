import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BlockOrderByWithRelationInput } from "../inputs/BlockOrderByWithRelationInput";
import { SortOrderInput } from "../inputs/SortOrderInput";
import { TransactionOrderByWithRelationInput } from "../inputs/TransactionOrderByWithRelationInput";
import { SortOrder } from "../../enums/SortOrder";

@TypeGraphQL.InputType("TransactionExecutionResultOrderByWithRelationInput", {})
export class TransactionExecutionResultOrderByWithRelationInput {
  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  stateTransitions?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  protocolTransitions?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  status?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => SortOrderInput, {
    nullable: true
  })
  statusMessage?: SortOrderInput | undefined;

  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  txHash?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  blockHash?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => TransactionOrderByWithRelationInput, {
    nullable: true
  })
  tx?: TransactionOrderByWithRelationInput | undefined;

  @TypeGraphQL.Field(_type => BlockOrderByWithRelationInput, {
    nullable: true
  })
  block?: BlockOrderByWithRelationInput | undefined;
}
