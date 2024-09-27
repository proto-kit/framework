import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { IncomingMessageBatch } from "../../models/IncomingMessageBatch";
import { Transaction } from "../../models/Transaction";

@TypeGraphQL.ObjectType("CreateManyAndReturnIncomingMessageBatchTransaction", {})
export class CreateManyAndReturnIncomingMessageBatchTransaction {
  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  transactionHash!: string;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: false
  })
  batchId!: number;

  @TypeGraphQL.Field(_type => Transaction, {
    nullable: false
  })
  transaction!: Transaction;

  @TypeGraphQL.Field(_type => IncomingMessageBatch, {
    nullable: false
  })
  batch!: IncomingMessageBatch;
}
