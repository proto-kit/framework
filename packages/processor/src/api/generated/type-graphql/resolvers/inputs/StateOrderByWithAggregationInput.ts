import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { StateAvgOrderByAggregateInput } from "../inputs/StateAvgOrderByAggregateInput";
import { StateCountOrderByAggregateInput } from "../inputs/StateCountOrderByAggregateInput";
import { StateMaxOrderByAggregateInput } from "../inputs/StateMaxOrderByAggregateInput";
import { StateMinOrderByAggregateInput } from "../inputs/StateMinOrderByAggregateInput";
import { StateSumOrderByAggregateInput } from "../inputs/StateSumOrderByAggregateInput";
import { SortOrder } from "../../enums/SortOrder";

@TypeGraphQL.InputType("StateOrderByWithAggregationInput", {})
export class StateOrderByWithAggregationInput {
  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  path?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  values?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => SortOrder, {
    nullable: true
  })
  mask?: "asc" | "desc" | undefined;

  @TypeGraphQL.Field(_type => StateCountOrderByAggregateInput, {
    nullable: true
  })
  _count?: StateCountOrderByAggregateInput | undefined;

  @TypeGraphQL.Field(_type => StateAvgOrderByAggregateInput, {
    nullable: true
  })
  _avg?: StateAvgOrderByAggregateInput | undefined;

  @TypeGraphQL.Field(_type => StateMaxOrderByAggregateInput, {
    nullable: true
  })
  _max?: StateMaxOrderByAggregateInput | undefined;

  @TypeGraphQL.Field(_type => StateMinOrderByAggregateInput, {
    nullable: true
  })
  _min?: StateMinOrderByAggregateInput | undefined;

  @TypeGraphQL.Field(_type => StateSumOrderByAggregateInput, {
    nullable: true
  })
  _sum?: StateSumOrderByAggregateInput | undefined;
}
