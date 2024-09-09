import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BlockCreateOrConnectWithoutSuccessorInput } from "../inputs/BlockCreateOrConnectWithoutSuccessorInput";
import { BlockCreateWithoutSuccessorInput } from "../inputs/BlockCreateWithoutSuccessorInput";
import { BlockWhereUniqueInput } from "../inputs/BlockWhereUniqueInput";

@TypeGraphQL.InputType("BlockCreateNestedOneWithoutSuccessorInput", {})
export class BlockCreateNestedOneWithoutSuccessorInput {
  @TypeGraphQL.Field(_type => BlockCreateWithoutSuccessorInput, {
    nullable: true
  })
  create?: BlockCreateWithoutSuccessorInput | undefined;

  @TypeGraphQL.Field(_type => BlockCreateOrConnectWithoutSuccessorInput, {
    nullable: true
  })
  connectOrCreate?: BlockCreateOrConnectWithoutSuccessorInput | undefined;

  @TypeGraphQL.Field(_type => BlockWhereUniqueInput, {
    nullable: true
  })
  connect?: BlockWhereUniqueInput | undefined;
}
