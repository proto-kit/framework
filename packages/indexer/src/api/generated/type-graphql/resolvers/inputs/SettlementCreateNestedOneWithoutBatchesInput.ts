import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { SettlementCreateOrConnectWithoutBatchesInput } from "../inputs/SettlementCreateOrConnectWithoutBatchesInput";
import { SettlementCreateWithoutBatchesInput } from "../inputs/SettlementCreateWithoutBatchesInput";
import { SettlementWhereUniqueInput } from "../inputs/SettlementWhereUniqueInput";

@TypeGraphQL.InputType("SettlementCreateNestedOneWithoutBatchesInput", {})
export class SettlementCreateNestedOneWithoutBatchesInput {
  @TypeGraphQL.Field(_type => SettlementCreateWithoutBatchesInput, {
    nullable: true
  })
  create?: SettlementCreateWithoutBatchesInput | undefined;

  @TypeGraphQL.Field(_type => SettlementCreateOrConnectWithoutBatchesInput, {
    nullable: true
  })
  connectOrCreate?: SettlementCreateOrConnectWithoutBatchesInput | undefined;

  @TypeGraphQL.Field(_type => SettlementWhereUniqueInput, {
    nullable: true
  })
  connect?: SettlementWhereUniqueInput | undefined;
}
