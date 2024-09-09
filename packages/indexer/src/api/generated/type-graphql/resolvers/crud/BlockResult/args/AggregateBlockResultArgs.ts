import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { BlockResultOrderByWithRelationInput } from "../../../inputs/BlockResultOrderByWithRelationInput";
import { BlockResultWhereInput } from "../../../inputs/BlockResultWhereInput";
import { BlockResultWhereUniqueInput } from "../../../inputs/BlockResultWhereUniqueInput";

@TypeGraphQL.ArgsType()
export class AggregateBlockResultArgs {
  @TypeGraphQL.Field(_type => BlockResultWhereInput, {
    nullable: true
  })
  where?: BlockResultWhereInput | undefined;

  @TypeGraphQL.Field(_type => [BlockResultOrderByWithRelationInput], {
    nullable: true
  })
  orderBy?: BlockResultOrderByWithRelationInput[] | undefined;

  @TypeGraphQL.Field(_type => BlockResultWhereUniqueInput, {
    nullable: true
  })
  cursor?: BlockResultWhereUniqueInput | undefined;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: true
  })
  take?: number | undefined;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: true
  })
  skip?: number | undefined;
}
