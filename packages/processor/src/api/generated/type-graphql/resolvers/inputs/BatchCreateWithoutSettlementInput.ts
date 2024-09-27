import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BlockCreateNestedManyWithoutBatchInput } from "../inputs/BlockCreateNestedManyWithoutBatchInput";

@TypeGraphQL.InputType("BatchCreateWithoutSettlementInput", {})
export class BatchCreateWithoutSettlementInput {
  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: false
  })
  height!: number;

  @TypeGraphQL.Field(_type => GraphQLScalars.JSONResolver, {
    nullable: false
  })
  proof!: Prisma.InputJsonValue;

  @TypeGraphQL.Field(_type => BlockCreateNestedManyWithoutBatchInput, {
    nullable: true
  })
  blocks?: BlockCreateNestedManyWithoutBatchInput | undefined;
}
