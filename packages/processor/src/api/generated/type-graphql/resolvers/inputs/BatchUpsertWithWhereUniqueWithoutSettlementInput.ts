import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BatchCreateWithoutSettlementInput } from "../inputs/BatchCreateWithoutSettlementInput";
import { BatchUpdateWithoutSettlementInput } from "../inputs/BatchUpdateWithoutSettlementInput";
import { BatchWhereUniqueInput } from "../inputs/BatchWhereUniqueInput";

@TypeGraphQL.InputType("BatchUpsertWithWhereUniqueWithoutSettlementInput", {})
export class BatchUpsertWithWhereUniqueWithoutSettlementInput {
  @TypeGraphQL.Field(_type => BatchWhereUniqueInput, {
    nullable: false
  })
  where!: BatchWhereUniqueInput;

  @TypeGraphQL.Field(_type => BatchUpdateWithoutSettlementInput, {
    nullable: false
  })
  update!: BatchUpdateWithoutSettlementInput;

  @TypeGraphQL.Field(_type => BatchCreateWithoutSettlementInput, {
    nullable: false
  })
  create!: BatchCreateWithoutSettlementInput;
}
