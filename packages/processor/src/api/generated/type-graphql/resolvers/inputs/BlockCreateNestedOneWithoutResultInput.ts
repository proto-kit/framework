import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BlockCreateOrConnectWithoutResultInput } from "../inputs/BlockCreateOrConnectWithoutResultInput";
import { BlockCreateWithoutResultInput } from "../inputs/BlockCreateWithoutResultInput";
import { BlockWhereUniqueInput } from "../inputs/BlockWhereUniqueInput";

@TypeGraphQL.InputType("BlockCreateNestedOneWithoutResultInput", {})
export class BlockCreateNestedOneWithoutResultInput {
  @TypeGraphQL.Field(_type => BlockCreateWithoutResultInput, {
    nullable: true
  })
  create?: BlockCreateWithoutResultInput | undefined;

  @TypeGraphQL.Field(_type => BlockCreateOrConnectWithoutResultInput, {
    nullable: true
  })
  connectOrCreate?: BlockCreateOrConnectWithoutResultInput | undefined;

  @TypeGraphQL.Field(_type => BlockWhereUniqueInput, {
    nullable: true
  })
  connect?: BlockWhereUniqueInput | undefined;
}
