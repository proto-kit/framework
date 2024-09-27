import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { SettlementCreateWithoutBatchesInput } from "../inputs/SettlementCreateWithoutBatchesInput";
import { SettlementUpdateWithoutBatchesInput } from "../inputs/SettlementUpdateWithoutBatchesInput";
import { SettlementWhereInput } from "../inputs/SettlementWhereInput";

@TypeGraphQL.InputType("SettlementUpsertWithoutBatchesInput", {})
export class SettlementUpsertWithoutBatchesInput {
  @TypeGraphQL.Field(_type => SettlementUpdateWithoutBatchesInput, {
    nullable: false
  })
  update!: SettlementUpdateWithoutBatchesInput;

  @TypeGraphQL.Field(_type => SettlementCreateWithoutBatchesInput, {
    nullable: false
  })
  create!: SettlementCreateWithoutBatchesInput;

  @TypeGraphQL.Field(_type => SettlementWhereInput, {
    nullable: true
  })
  where?: SettlementWhereInput | undefined;
}
