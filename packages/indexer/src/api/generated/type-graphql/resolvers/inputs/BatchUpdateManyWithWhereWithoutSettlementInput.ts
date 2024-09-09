import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BatchScalarWhereInput } from "../inputs/BatchScalarWhereInput";
import { BatchUpdateManyMutationInput } from "../inputs/BatchUpdateManyMutationInput";

@TypeGraphQL.InputType("BatchUpdateManyWithWhereWithoutSettlementInput", {})
export class BatchUpdateManyWithWhereWithoutSettlementInput {
  @TypeGraphQL.Field(_type => BatchScalarWhereInput, {
    nullable: false
  })
  where!: BatchScalarWhereInput;

  @TypeGraphQL.Field(_type => BatchUpdateManyMutationInput, {
    nullable: false
  })
  data!: BatchUpdateManyMutationInput;
}
