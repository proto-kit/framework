import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { SettlementCreateNestedOneWithoutBatchesInput } from "../inputs/SettlementCreateNestedOneWithoutBatchesInput";

@TypeGraphQL.InputType("BatchCreateWithoutBlocksInput", {})
export class BatchCreateWithoutBlocksInput {
  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: false
  })
  height!: number;

  @TypeGraphQL.Field(_type => GraphQLScalars.JSONResolver, {
    nullable: false
  })
  proof!: Prisma.InputJsonValue;

  @TypeGraphQL.Field(_type => SettlementCreateNestedOneWithoutBatchesInput, {
    nullable: true
  })
  settlement?: SettlementCreateNestedOneWithoutBatchesInput | undefined;
}
