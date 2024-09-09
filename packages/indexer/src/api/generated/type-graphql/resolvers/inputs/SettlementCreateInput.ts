import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BatchCreateNestedManyWithoutSettlementInput } from "../inputs/BatchCreateNestedManyWithoutSettlementInput";

@TypeGraphQL.InputType("SettlementCreateInput", {})
export class SettlementCreateInput {
  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  transactionHash!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  promisedMessagesHash!: string;

  @TypeGraphQL.Field(_type => BatchCreateNestedManyWithoutSettlementInput, {
    nullable: true
  })
  batches?: BatchCreateNestedManyWithoutSettlementInput | undefined;
}
