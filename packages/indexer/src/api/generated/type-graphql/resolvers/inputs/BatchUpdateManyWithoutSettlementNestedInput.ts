import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BatchCreateManySettlementInputEnvelope } from "../inputs/BatchCreateManySettlementInputEnvelope";
import { BatchCreateOrConnectWithoutSettlementInput } from "../inputs/BatchCreateOrConnectWithoutSettlementInput";
import { BatchCreateWithoutSettlementInput } from "../inputs/BatchCreateWithoutSettlementInput";
import { BatchScalarWhereInput } from "../inputs/BatchScalarWhereInput";
import { BatchUpdateManyWithWhereWithoutSettlementInput } from "../inputs/BatchUpdateManyWithWhereWithoutSettlementInput";
import { BatchUpdateWithWhereUniqueWithoutSettlementInput } from "../inputs/BatchUpdateWithWhereUniqueWithoutSettlementInput";
import { BatchUpsertWithWhereUniqueWithoutSettlementInput } from "../inputs/BatchUpsertWithWhereUniqueWithoutSettlementInput";
import { BatchWhereUniqueInput } from "../inputs/BatchWhereUniqueInput";

@TypeGraphQL.InputType("BatchUpdateManyWithoutSettlementNestedInput", {})
export class BatchUpdateManyWithoutSettlementNestedInput {
  @TypeGraphQL.Field(_type => [BatchCreateWithoutSettlementInput], {
    nullable: true
  })
  create?: BatchCreateWithoutSettlementInput[] | undefined;

  @TypeGraphQL.Field(_type => [BatchCreateOrConnectWithoutSettlementInput], {
    nullable: true
  })
  connectOrCreate?: BatchCreateOrConnectWithoutSettlementInput[] | undefined;

  @TypeGraphQL.Field(_type => [BatchUpsertWithWhereUniqueWithoutSettlementInput], {
    nullable: true
  })
  upsert?: BatchUpsertWithWhereUniqueWithoutSettlementInput[] | undefined;

  @TypeGraphQL.Field(_type => BatchCreateManySettlementInputEnvelope, {
    nullable: true
  })
  createMany?: BatchCreateManySettlementInputEnvelope | undefined;

  @TypeGraphQL.Field(_type => [BatchWhereUniqueInput], {
    nullable: true
  })
  set?: BatchWhereUniqueInput[] | undefined;

  @TypeGraphQL.Field(_type => [BatchWhereUniqueInput], {
    nullable: true
  })
  disconnect?: BatchWhereUniqueInput[] | undefined;

  @TypeGraphQL.Field(_type => [BatchWhereUniqueInput], {
    nullable: true
  })
  delete?: BatchWhereUniqueInput[] | undefined;

  @TypeGraphQL.Field(_type => [BatchWhereUniqueInput], {
    nullable: true
  })
  connect?: BatchWhereUniqueInput[] | undefined;

  @TypeGraphQL.Field(_type => [BatchUpdateWithWhereUniqueWithoutSettlementInput], {
    nullable: true
  })
  update?: BatchUpdateWithWhereUniqueWithoutSettlementInput[] | undefined;

  @TypeGraphQL.Field(_type => [BatchUpdateManyWithWhereWithoutSettlementInput], {
    nullable: true
  })
  updateMany?: BatchUpdateManyWithWhereWithoutSettlementInput[] | undefined;

  @TypeGraphQL.Field(_type => [BatchScalarWhereInput], {
    nullable: true
  })
  deleteMany?: BatchScalarWhereInput[] | undefined;
}
