import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { StateOrderByWithAggregationInput } from "../../../inputs/StateOrderByWithAggregationInput";
import { StateScalarWhereWithAggregatesInput } from "../../../inputs/StateScalarWhereWithAggregatesInput";
import { StateWhereInput } from "../../../inputs/StateWhereInput";
import { StateScalarFieldEnum } from "../../../../enums/StateScalarFieldEnum";

@TypeGraphQL.ArgsType()
export class GroupByStateArgs {
  @TypeGraphQL.Field(_type => StateWhereInput, {
    nullable: true
  })
  where?: StateWhereInput | undefined;

  @TypeGraphQL.Field(_type => [StateOrderByWithAggregationInput], {
    nullable: true
  })
  orderBy?: StateOrderByWithAggregationInput[] | undefined;

  @TypeGraphQL.Field(_type => [StateScalarFieldEnum], {
    nullable: false
  })
  by!: Array<"path" | "values" | "mask">;

  @TypeGraphQL.Field(_type => StateScalarWhereWithAggregatesInput, {
    nullable: true
  })
  having?: StateScalarWhereWithAggregatesInput | undefined;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: true
  })
  take?: number | undefined;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: true
  })
  skip?: number | undefined;
}
