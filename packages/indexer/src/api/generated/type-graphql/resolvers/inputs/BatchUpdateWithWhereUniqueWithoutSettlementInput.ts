import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BatchUpdateWithoutSettlementInput } from "../inputs/BatchUpdateWithoutSettlementInput";
import { BatchWhereUniqueInput } from "../inputs/BatchWhereUniqueInput";

@TypeGraphQL.InputType("BatchUpdateWithWhereUniqueWithoutSettlementInput", {})
export class BatchUpdateWithWhereUniqueWithoutSettlementInput {
  @TypeGraphQL.Field(_type => BatchWhereUniqueInput, {
    nullable: false
  })
  where!: BatchWhereUniqueInput;

  @TypeGraphQL.Field(_type => BatchUpdateWithoutSettlementInput, {
    nullable: false
  })
  data!: BatchUpdateWithoutSettlementInput;
}
