import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { BlockResultOrderByWithAggregationInput } from "../../../inputs/BlockResultOrderByWithAggregationInput";
import { BlockResultScalarWhereWithAggregatesInput } from "../../../inputs/BlockResultScalarWhereWithAggregatesInput";
import { BlockResultWhereInput } from "../../../inputs/BlockResultWhereInput";
import { BlockResultScalarFieldEnum } from "../../../../enums/BlockResultScalarFieldEnum";

@TypeGraphQL.ArgsType()
export class GroupByBlockResultArgs {
  @TypeGraphQL.Field(_type => BlockResultWhereInput, {
    nullable: true
  })
  where?: BlockResultWhereInput | undefined;

  @TypeGraphQL.Field(_type => [BlockResultOrderByWithAggregationInput], {
    nullable: true
  })
  orderBy?: BlockResultOrderByWithAggregationInput[] | undefined;

  @TypeGraphQL.Field(_type => [BlockResultScalarFieldEnum], {
    nullable: false
  })
  by!: Array<"blockHash" | "stateRoot" | "blockHashRoot" | "afterNetworkState" | "blockStateTransitions" | "blockHashWitness">;

  @TypeGraphQL.Field(_type => BlockResultScalarWhereWithAggregatesInput, {
    nullable: true
  })
  having?: BlockResultScalarWhereWithAggregatesInput | undefined;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: true
  })
  take?: number | undefined;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: true
  })
  skip?: number | undefined;
}
