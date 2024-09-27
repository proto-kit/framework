import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BatchCreateManySettlementInput } from "../inputs/BatchCreateManySettlementInput";

@TypeGraphQL.InputType("BatchCreateManySettlementInputEnvelope", {})
export class BatchCreateManySettlementInputEnvelope {
  @TypeGraphQL.Field(_type => [BatchCreateManySettlementInput], {
    nullable: false
  })
  data!: BatchCreateManySettlementInput[];

  @TypeGraphQL.Field(_type => Boolean, {
    nullable: true
  })
  skipDuplicates?: boolean | undefined;
}
