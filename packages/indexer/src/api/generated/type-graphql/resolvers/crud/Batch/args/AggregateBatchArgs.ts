import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { BatchOrderByWithRelationInput } from "../../../inputs/BatchOrderByWithRelationInput";
import { BatchWhereInput } from "../../../inputs/BatchWhereInput";
import { BatchWhereUniqueInput } from "../../../inputs/BatchWhereUniqueInput";

@TypeGraphQL.ArgsType()
export class AggregateBatchArgs {
  @TypeGraphQL.Field(_type => BatchWhereInput, {
    nullable: true
  })
  where?: BatchWhereInput | undefined;

  @TypeGraphQL.Field(_type => [BatchOrderByWithRelationInput], {
    nullable: true
  })
  orderBy?: BatchOrderByWithRelationInput[] | undefined;

  @TypeGraphQL.Field(_type => BatchWhereUniqueInput, {
    nullable: true
  })
  cursor?: BatchWhereUniqueInput | undefined;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: true
  })
  take?: number | undefined;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: true
  })
  skip?: number | undefined;
}
