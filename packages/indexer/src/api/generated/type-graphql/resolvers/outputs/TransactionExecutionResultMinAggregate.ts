import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";

@TypeGraphQL.ObjectType("TransactionExecutionResultMinAggregate", {})
export class TransactionExecutionResultMinAggregate {
  @TypeGraphQL.Field(_type => Boolean, {
    nullable: true
  })
  status!: boolean | null;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  statusMessage!: string | null;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  txHash!: string | null;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  blockHash!: string | null;
}
