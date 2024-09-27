import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";

@TypeGraphQL.ObjectType("IncomingMessageBatchTransactionMaxAggregate", {})
export class IncomingMessageBatchTransactionMaxAggregate {
  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  transactionHash!: string | null;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: true
  })
  batchId!: number | null;
}
