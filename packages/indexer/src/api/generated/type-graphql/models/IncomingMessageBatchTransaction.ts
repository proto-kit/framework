import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../scalars";
import { IncomingMessageBatch } from "../models/IncomingMessageBatch";
import { Transaction } from "../models/Transaction";

@TypeGraphQL.ObjectType("IncomingMessageBatchTransaction", {})
export class IncomingMessageBatchTransaction {
  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  transactionHash!: string;

  transaction?: Transaction;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: false
  })
  batchId!: number;

  batch?: IncomingMessageBatch;
}
