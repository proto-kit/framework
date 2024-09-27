import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { TransactionExecutionResultCreateManyBlockInputEnvelope } from "../inputs/TransactionExecutionResultCreateManyBlockInputEnvelope";
import { TransactionExecutionResultCreateOrConnectWithoutBlockInput } from "../inputs/TransactionExecutionResultCreateOrConnectWithoutBlockInput";
import { TransactionExecutionResultCreateWithoutBlockInput } from "../inputs/TransactionExecutionResultCreateWithoutBlockInput";
import { TransactionExecutionResultScalarWhereInput } from "../inputs/TransactionExecutionResultScalarWhereInput";
import { TransactionExecutionResultUpdateManyWithWhereWithoutBlockInput } from "../inputs/TransactionExecutionResultUpdateManyWithWhereWithoutBlockInput";
import { TransactionExecutionResultUpdateWithWhereUniqueWithoutBlockInput } from "../inputs/TransactionExecutionResultUpdateWithWhereUniqueWithoutBlockInput";
import { TransactionExecutionResultUpsertWithWhereUniqueWithoutBlockInput } from "../inputs/TransactionExecutionResultUpsertWithWhereUniqueWithoutBlockInput";
import { TransactionExecutionResultWhereUniqueInput } from "../inputs/TransactionExecutionResultWhereUniqueInput";

@TypeGraphQL.InputType("TransactionExecutionResultUpdateManyWithoutBlockNestedInput", {})
export class TransactionExecutionResultUpdateManyWithoutBlockNestedInput {
  @TypeGraphQL.Field(_type => [TransactionExecutionResultCreateWithoutBlockInput], {
    nullable: true
  })
  create?: TransactionExecutionResultCreateWithoutBlockInput[] | undefined;

  @TypeGraphQL.Field(_type => [TransactionExecutionResultCreateOrConnectWithoutBlockInput], {
    nullable: true
  })
  connectOrCreate?: TransactionExecutionResultCreateOrConnectWithoutBlockInput[] | undefined;

  @TypeGraphQL.Field(_type => [TransactionExecutionResultUpsertWithWhereUniqueWithoutBlockInput], {
    nullable: true
  })
  upsert?: TransactionExecutionResultUpsertWithWhereUniqueWithoutBlockInput[] | undefined;

  @TypeGraphQL.Field(_type => TransactionExecutionResultCreateManyBlockInputEnvelope, {
    nullable: true
  })
  createMany?: TransactionExecutionResultCreateManyBlockInputEnvelope | undefined;

  @TypeGraphQL.Field(_type => [TransactionExecutionResultWhereUniqueInput], {
    nullable: true
  })
  set?: TransactionExecutionResultWhereUniqueInput[] | undefined;

  @TypeGraphQL.Field(_type => [TransactionExecutionResultWhereUniqueInput], {
    nullable: true
  })
  disconnect?: TransactionExecutionResultWhereUniqueInput[] | undefined;

  @TypeGraphQL.Field(_type => [TransactionExecutionResultWhereUniqueInput], {
    nullable: true
  })
  delete?: TransactionExecutionResultWhereUniqueInput[] | undefined;

  @TypeGraphQL.Field(_type => [TransactionExecutionResultWhereUniqueInput], {
    nullable: true
  })
  connect?: TransactionExecutionResultWhereUniqueInput[] | undefined;

  @TypeGraphQL.Field(_type => [TransactionExecutionResultUpdateWithWhereUniqueWithoutBlockInput], {
    nullable: true
  })
  update?: TransactionExecutionResultUpdateWithWhereUniqueWithoutBlockInput[] | undefined;

  @TypeGraphQL.Field(_type => [TransactionExecutionResultUpdateManyWithWhereWithoutBlockInput], {
    nullable: true
  })
  updateMany?: TransactionExecutionResultUpdateManyWithWhereWithoutBlockInput[] | undefined;

  @TypeGraphQL.Field(_type => [TransactionExecutionResultScalarWhereInput], {
    nullable: true
  })
  deleteMany?: TransactionExecutionResultScalarWhereInput[] | undefined;
}
