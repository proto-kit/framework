import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BlockCreateOrConnectWithoutResultInput } from "../inputs/BlockCreateOrConnectWithoutResultInput";
import { BlockCreateWithoutResultInput } from "../inputs/BlockCreateWithoutResultInput";
import { BlockUpdateToOneWithWhereWithoutResultInput } from "../inputs/BlockUpdateToOneWithWhereWithoutResultInput";
import { BlockUpsertWithoutResultInput } from "../inputs/BlockUpsertWithoutResultInput";
import { BlockWhereInput } from "../inputs/BlockWhereInput";
import { BlockWhereUniqueInput } from "../inputs/BlockWhereUniqueInput";

@TypeGraphQL.InputType("BlockUpdateOneWithoutResultNestedInput", {})
export class BlockUpdateOneWithoutResultNestedInput {
  @TypeGraphQL.Field(_type => BlockCreateWithoutResultInput, {
    nullable: true
  })
  create?: BlockCreateWithoutResultInput | undefined;

  @TypeGraphQL.Field(_type => BlockCreateOrConnectWithoutResultInput, {
    nullable: true
  })
  connectOrCreate?: BlockCreateOrConnectWithoutResultInput | undefined;

  @TypeGraphQL.Field(_type => BlockUpsertWithoutResultInput, {
    nullable: true
  })
  upsert?: BlockUpsertWithoutResultInput | undefined;

  @TypeGraphQL.Field(_type => BlockWhereInput, {
    nullable: true
  })
  disconnect?: BlockWhereInput | undefined;

  @TypeGraphQL.Field(_type => BlockWhereInput, {
    nullable: true
  })
  delete?: BlockWhereInput | undefined;

  @TypeGraphQL.Field(_type => BlockWhereUniqueInput, {
    nullable: true
  })
  connect?: BlockWhereUniqueInput | undefined;

  @TypeGraphQL.Field(_type => BlockUpdateToOneWithWhereWithoutResultInput, {
    nullable: true
  })
  update?: BlockUpdateToOneWithWhereWithoutResultInput | undefined;
}
