import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { SettlementCreateWithoutBatchesInput } from "../inputs/SettlementCreateWithoutBatchesInput";
import { SettlementWhereUniqueInput } from "../inputs/SettlementWhereUniqueInput";

@TypeGraphQL.InputType("SettlementCreateOrConnectWithoutBatchesInput", {})
export class SettlementCreateOrConnectWithoutBatchesInput {
  @TypeGraphQL.Field(_type => SettlementWhereUniqueInput, {
    nullable: false
  })
  where!: SettlementWhereUniqueInput;

  @TypeGraphQL.Field(_type => SettlementCreateWithoutBatchesInput, {
    nullable: false
  })
  create!: SettlementCreateWithoutBatchesInput;
}
