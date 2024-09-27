import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { IncomingMessageBatchTransactionCreateManyBatchInputEnvelope } from "../inputs/IncomingMessageBatchTransactionCreateManyBatchInputEnvelope";
import { IncomingMessageBatchTransactionCreateOrConnectWithoutBatchInput } from "../inputs/IncomingMessageBatchTransactionCreateOrConnectWithoutBatchInput";
import { IncomingMessageBatchTransactionCreateWithoutBatchInput } from "../inputs/IncomingMessageBatchTransactionCreateWithoutBatchInput";
import { IncomingMessageBatchTransactionScalarWhereInput } from "../inputs/IncomingMessageBatchTransactionScalarWhereInput";
import { IncomingMessageBatchTransactionUpdateManyWithWhereWithoutBatchInput } from "../inputs/IncomingMessageBatchTransactionUpdateManyWithWhereWithoutBatchInput";
import { IncomingMessageBatchTransactionUpdateWithWhereUniqueWithoutBatchInput } from "../inputs/IncomingMessageBatchTransactionUpdateWithWhereUniqueWithoutBatchInput";
import { IncomingMessageBatchTransactionUpsertWithWhereUniqueWithoutBatchInput } from "../inputs/IncomingMessageBatchTransactionUpsertWithWhereUniqueWithoutBatchInput";
import { IncomingMessageBatchTransactionWhereUniqueInput } from "../inputs/IncomingMessageBatchTransactionWhereUniqueInput";

@TypeGraphQL.InputType("IncomingMessageBatchTransactionUpdateManyWithoutBatchNestedInput", {})
export class IncomingMessageBatchTransactionUpdateManyWithoutBatchNestedInput {
  @TypeGraphQL.Field(_type => [IncomingMessageBatchTransactionCreateWithoutBatchInput], {
    nullable: true
  })
  create?: IncomingMessageBatchTransactionCreateWithoutBatchInput[] | undefined;

  @TypeGraphQL.Field(_type => [IncomingMessageBatchTransactionCreateOrConnectWithoutBatchInput], {
    nullable: true
  })
  connectOrCreate?: IncomingMessageBatchTransactionCreateOrConnectWithoutBatchInput[] | undefined;

  @TypeGraphQL.Field(_type => [IncomingMessageBatchTransactionUpsertWithWhereUniqueWithoutBatchInput], {
    nullable: true
  })
  upsert?: IncomingMessageBatchTransactionUpsertWithWhereUniqueWithoutBatchInput[] | undefined;

  @TypeGraphQL.Field(_type => IncomingMessageBatchTransactionCreateManyBatchInputEnvelope, {
    nullable: true
  })
  createMany?: IncomingMessageBatchTransactionCreateManyBatchInputEnvelope | undefined;

  @TypeGraphQL.Field(_type => [IncomingMessageBatchTransactionWhereUniqueInput], {
    nullable: true
  })
  set?: IncomingMessageBatchTransactionWhereUniqueInput[] | undefined;

  @TypeGraphQL.Field(_type => [IncomingMessageBatchTransactionWhereUniqueInput], {
    nullable: true
  })
  disconnect?: IncomingMessageBatchTransactionWhereUniqueInput[] | undefined;

  @TypeGraphQL.Field(_type => [IncomingMessageBatchTransactionWhereUniqueInput], {
    nullable: true
  })
  delete?: IncomingMessageBatchTransactionWhereUniqueInput[] | undefined;

  @TypeGraphQL.Field(_type => [IncomingMessageBatchTransactionWhereUniqueInput], {
    nullable: true
  })
  connect?: IncomingMessageBatchTransactionWhereUniqueInput[] | undefined;

  @TypeGraphQL.Field(_type => [IncomingMessageBatchTransactionUpdateWithWhereUniqueWithoutBatchInput], {
    nullable: true
  })
  update?: IncomingMessageBatchTransactionUpdateWithWhereUniqueWithoutBatchInput[] | undefined;

  @TypeGraphQL.Field(_type => [IncomingMessageBatchTransactionUpdateManyWithWhereWithoutBatchInput], {
    nullable: true
  })
  updateMany?: IncomingMessageBatchTransactionUpdateManyWithWhereWithoutBatchInput[] | undefined;

  @TypeGraphQL.Field(_type => [IncomingMessageBatchTransactionScalarWhereInput], {
    nullable: true
  })
  deleteMany?: IncomingMessageBatchTransactionScalarWhereInput[] | undefined;
}
