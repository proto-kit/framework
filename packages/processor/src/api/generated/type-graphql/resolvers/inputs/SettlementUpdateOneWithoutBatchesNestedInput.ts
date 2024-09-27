import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { SettlementCreateOrConnectWithoutBatchesInput } from "../inputs/SettlementCreateOrConnectWithoutBatchesInput";
import { SettlementCreateWithoutBatchesInput } from "../inputs/SettlementCreateWithoutBatchesInput";
import { SettlementUpdateToOneWithWhereWithoutBatchesInput } from "../inputs/SettlementUpdateToOneWithWhereWithoutBatchesInput";
import { SettlementUpsertWithoutBatchesInput } from "../inputs/SettlementUpsertWithoutBatchesInput";
import { SettlementWhereInput } from "../inputs/SettlementWhereInput";
import { SettlementWhereUniqueInput } from "../inputs/SettlementWhereUniqueInput";

@TypeGraphQL.InputType("SettlementUpdateOneWithoutBatchesNestedInput", {})
export class SettlementUpdateOneWithoutBatchesNestedInput {
  @TypeGraphQL.Field(_type => SettlementCreateWithoutBatchesInput, {
    nullable: true
  })
  create?: SettlementCreateWithoutBatchesInput | undefined;

  @TypeGraphQL.Field(_type => SettlementCreateOrConnectWithoutBatchesInput, {
    nullable: true
  })
  connectOrCreate?: SettlementCreateOrConnectWithoutBatchesInput | undefined;

  @TypeGraphQL.Field(_type => SettlementUpsertWithoutBatchesInput, {
    nullable: true
  })
  upsert?: SettlementUpsertWithoutBatchesInput | undefined;

  @TypeGraphQL.Field(_type => SettlementWhereInput, {
    nullable: true
  })
  disconnect?: SettlementWhereInput | undefined;

  @TypeGraphQL.Field(_type => SettlementWhereInput, {
    nullable: true
  })
  delete?: SettlementWhereInput | undefined;

  @TypeGraphQL.Field(_type => SettlementWhereUniqueInput, {
    nullable: true
  })
  connect?: SettlementWhereUniqueInput | undefined;

  @TypeGraphQL.Field(_type => SettlementUpdateToOneWithWhereWithoutBatchesInput, {
    nullable: true
  })
  update?: SettlementUpdateToOneWithWhereWithoutBatchesInput | undefined;
}
