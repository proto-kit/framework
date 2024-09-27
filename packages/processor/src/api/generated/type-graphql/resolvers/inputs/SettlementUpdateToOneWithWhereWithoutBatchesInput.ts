import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { SettlementUpdateWithoutBatchesInput } from "../inputs/SettlementUpdateWithoutBatchesInput";
import { SettlementWhereInput } from "../inputs/SettlementWhereInput";

@TypeGraphQL.InputType("SettlementUpdateToOneWithWhereWithoutBatchesInput", {})
export class SettlementUpdateToOneWithWhereWithoutBatchesInput {
  @TypeGraphQL.Field(_type => SettlementWhereInput, {
    nullable: true
  })
  where?: SettlementWhereInput | undefined;

  @TypeGraphQL.Field(_type => SettlementUpdateWithoutBatchesInput, {
    nullable: false
  })
  data!: SettlementUpdateWithoutBatchesInput;
}
