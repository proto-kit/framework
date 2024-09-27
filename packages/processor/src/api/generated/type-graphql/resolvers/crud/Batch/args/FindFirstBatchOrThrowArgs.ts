import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { BatchOrderByWithRelationInput } from "../../../inputs/BatchOrderByWithRelationInput";
import { BatchWhereInput } from "../../../inputs/BatchWhereInput";
import { BatchWhereUniqueInput } from "../../../inputs/BatchWhereUniqueInput";
import { BatchScalarFieldEnum } from "../../../../enums/BatchScalarFieldEnum";

@TypeGraphQL.ArgsType()
export class FindFirstBatchOrThrowArgs {
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

  @TypeGraphQL.Field(_type => [BatchScalarFieldEnum], {
    nullable: true
  })
  distinct?: Array<"height" | "proof" | "settlementTransactionHash"> | undefined;
}
