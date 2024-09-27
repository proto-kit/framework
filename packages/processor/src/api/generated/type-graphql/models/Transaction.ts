import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../scalars";
import { IncomingMessageBatchTransaction } from "../models/IncomingMessageBatchTransaction";
import { TransactionExecutionResult } from "../models/TransactionExecutionResult";
import { TransactionCount } from "../resolvers/outputs/TransactionCount";

@TypeGraphQL.ObjectType("Transaction", {})
export class Transaction {
  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  hash!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  methodId!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  sender!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  nonce!: string;

  @TypeGraphQL.Field(_type => [String], {
    nullable: false
  })
  argsFields!: string[];

  @TypeGraphQL.Field(_type => [String], {
    nullable: false
  })
  auxiliaryData!: string[];

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  signature_r!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  signature_s!: string;

  @TypeGraphQL.Field(_type => Boolean, {
    nullable: false
  })
  isMessage!: boolean;

  executionResult?: TransactionExecutionResult | null;

  IncomingMessageBatchTransaction?: IncomingMessageBatchTransaction[];

  @TypeGraphQL.Field(_type => TransactionCount, {
    nullable: true
  })
  _count?: TransactionCount | null;
}
