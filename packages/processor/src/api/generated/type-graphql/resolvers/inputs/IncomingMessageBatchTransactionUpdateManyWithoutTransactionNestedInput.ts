import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { IncomingMessageBatchTransactionCreateManyTransactionInputEnvelope } from "../inputs/IncomingMessageBatchTransactionCreateManyTransactionInputEnvelope";
import { IncomingMessageBatchTransactionCreateOrConnectWithoutTransactionInput } from "../inputs/IncomingMessageBatchTransactionCreateOrConnectWithoutTransactionInput";
import { IncomingMessageBatchTransactionCreateWithoutTransactionInput } from "../inputs/IncomingMessageBatchTransactionCreateWithoutTransactionInput";
import { IncomingMessageBatchTransactionScalarWhereInput } from "../inputs/IncomingMessageBatchTransactionScalarWhereInput";
import { IncomingMessageBatchTransactionUpdateManyWithWhereWithoutTransactionInput } from "../inputs/IncomingMessageBatchTransactionUpdateManyWithWhereWithoutTransactionInput";
import { IncomingMessageBatchTransactionUpdateWithWhereUniqueWithoutTransactionInput } from "../inputs/IncomingMessageBatchTransactionUpdateWithWhereUniqueWithoutTransactionInput";
import { IncomingMessageBatchTransactionUpsertWithWhereUniqueWithoutTransactionInput } from "../inputs/IncomingMessageBatchTransactionUpsertWithWhereUniqueWithoutTransactionInput";
import { IncomingMessageBatchTransactionWhereUniqueInput } from "../inputs/IncomingMessageBatchTransactionWhereUniqueInput";

@TypeGraphQL.InputType("IncomingMessageBatchTransactionUpdateManyWithoutTransactionNestedInput", {})
export class IncomingMessageBatchTransactionUpdateManyWithoutTransactionNestedInput {
  @TypeGraphQL.Field(_type => [IncomingMessageBatchTransactionCreateWithoutTransactionInput], {
    nullable: true
  })
  create?: IncomingMessageBatchTransactionCreateWithoutTransactionInput[] | undefined;

  @TypeGraphQL.Field(_type => [IncomingMessageBatchTransactionCreateOrConnectWithoutTransactionInput], {
    nullable: true
  })
  connectOrCreate?: IncomingMessageBatchTransactionCreateOrConnectWithoutTransactionInput[] | undefined;

  @TypeGraphQL.Field(_type => [IncomingMessageBatchTransactionUpsertWithWhereUniqueWithoutTransactionInput], {
    nullable: true
  })
  upsert?: IncomingMessageBatchTransactionUpsertWithWhereUniqueWithoutTransactionInput[] | undefined;

  @TypeGraphQL.Field(_type => IncomingMessageBatchTransactionCreateManyTransactionInputEnvelope, {
    nullable: true
  })
  createMany?: IncomingMessageBatchTransactionCreateManyTransactionInputEnvelope | undefined;

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

  @TypeGraphQL.Field(_type => [IncomingMessageBatchTransactionUpdateWithWhereUniqueWithoutTransactionInput], {
    nullable: true
  })
  update?: IncomingMessageBatchTransactionUpdateWithWhereUniqueWithoutTransactionInput[] | undefined;

  @TypeGraphQL.Field(_type => [IncomingMessageBatchTransactionUpdateManyWithWhereWithoutTransactionInput], {
    nullable: true
  })
  updateMany?: IncomingMessageBatchTransactionUpdateManyWithWhereWithoutTransactionInput[] | undefined;

  @TypeGraphQL.Field(_type => [IncomingMessageBatchTransactionScalarWhereInput], {
    nullable: true
  })
  deleteMany?: IncomingMessageBatchTransactionScalarWhereInput[] | undefined;
}
