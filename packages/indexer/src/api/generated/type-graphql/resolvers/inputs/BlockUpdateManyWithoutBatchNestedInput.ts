import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BlockCreateManyBatchInputEnvelope } from "../inputs/BlockCreateManyBatchInputEnvelope";
import { BlockCreateOrConnectWithoutBatchInput } from "../inputs/BlockCreateOrConnectWithoutBatchInput";
import { BlockCreateWithoutBatchInput } from "../inputs/BlockCreateWithoutBatchInput";
import { BlockScalarWhereInput } from "../inputs/BlockScalarWhereInput";
import { BlockUpdateManyWithWhereWithoutBatchInput } from "../inputs/BlockUpdateManyWithWhereWithoutBatchInput";
import { BlockUpdateWithWhereUniqueWithoutBatchInput } from "../inputs/BlockUpdateWithWhereUniqueWithoutBatchInput";
import { BlockUpsertWithWhereUniqueWithoutBatchInput } from "../inputs/BlockUpsertWithWhereUniqueWithoutBatchInput";
import { BlockWhereUniqueInput } from "../inputs/BlockWhereUniqueInput";

@TypeGraphQL.InputType("BlockUpdateManyWithoutBatchNestedInput", {})
export class BlockUpdateManyWithoutBatchNestedInput {
  @TypeGraphQL.Field(_type => [BlockCreateWithoutBatchInput], {
    nullable: true
  })
  create?: BlockCreateWithoutBatchInput[] | undefined;

  @TypeGraphQL.Field(_type => [BlockCreateOrConnectWithoutBatchInput], {
    nullable: true
  })
  connectOrCreate?: BlockCreateOrConnectWithoutBatchInput[] | undefined;

  @TypeGraphQL.Field(_type => [BlockUpsertWithWhereUniqueWithoutBatchInput], {
    nullable: true
  })
  upsert?: BlockUpsertWithWhereUniqueWithoutBatchInput[] | undefined;

  @TypeGraphQL.Field(_type => BlockCreateManyBatchInputEnvelope, {
    nullable: true
  })
  createMany?: BlockCreateManyBatchInputEnvelope | undefined;

  @TypeGraphQL.Field(_type => [BlockWhereUniqueInput], {
    nullable: true
  })
  set?: BlockWhereUniqueInput[] | undefined;

  @TypeGraphQL.Field(_type => [BlockWhereUniqueInput], {
    nullable: true
  })
  disconnect?: BlockWhereUniqueInput[] | undefined;

  @TypeGraphQL.Field(_type => [BlockWhereUniqueInput], {
    nullable: true
  })
  delete?: BlockWhereUniqueInput[] | undefined;

  @TypeGraphQL.Field(_type => [BlockWhereUniqueInput], {
    nullable: true
  })
  connect?: BlockWhereUniqueInput[] | undefined;

  @TypeGraphQL.Field(_type => [BlockUpdateWithWhereUniqueWithoutBatchInput], {
    nullable: true
  })
  update?: BlockUpdateWithWhereUniqueWithoutBatchInput[] | undefined;

  @TypeGraphQL.Field(_type => [BlockUpdateManyWithWhereWithoutBatchInput], {
    nullable: true
  })
  updateMany?: BlockUpdateManyWithWhereWithoutBatchInput[] | undefined;

  @TypeGraphQL.Field(_type => [BlockScalarWhereInput], {
    nullable: true
  })
  deleteMany?: BlockScalarWhereInput[] | undefined;
}
