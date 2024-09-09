import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BlockCreateManyBatchInputEnvelope } from "../inputs/BlockCreateManyBatchInputEnvelope";
import { BlockCreateOrConnectWithoutBatchInput } from "../inputs/BlockCreateOrConnectWithoutBatchInput";
import { BlockCreateWithoutBatchInput } from "../inputs/BlockCreateWithoutBatchInput";
import { BlockWhereUniqueInput } from "../inputs/BlockWhereUniqueInput";

@TypeGraphQL.InputType("BlockCreateNestedManyWithoutBatchInput", {})
export class BlockCreateNestedManyWithoutBatchInput {
  @TypeGraphQL.Field(_type => [BlockCreateWithoutBatchInput], {
    nullable: true
  })
  create?: BlockCreateWithoutBatchInput[] | undefined;

  @TypeGraphQL.Field(_type => [BlockCreateOrConnectWithoutBatchInput], {
    nullable: true
  })
  connectOrCreate?: BlockCreateOrConnectWithoutBatchInput[] | undefined;

  @TypeGraphQL.Field(_type => BlockCreateManyBatchInputEnvelope, {
    nullable: true
  })
  createMany?: BlockCreateManyBatchInputEnvelope | undefined;

  @TypeGraphQL.Field(_type => [BlockWhereUniqueInput], {
    nullable: true
  })
  connect?: BlockWhereUniqueInput[] | undefined;
}
