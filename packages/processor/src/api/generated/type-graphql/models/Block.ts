import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../scalars";
import { Batch } from "../models/Batch";
import { BlockResult } from "../models/BlockResult";
import { TransactionExecutionResult } from "../models/TransactionExecutionResult";
import { BlockCount } from "../resolvers/outputs/BlockCount";

@TypeGraphQL.ObjectType("Block", {})
export class Block {
  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  hash!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  transactionsHash!: string;

  @TypeGraphQL.Field(_type => GraphQLScalars.JSONResolver, {
    nullable: false
  })
  beforeNetworkState!: Prisma.JsonValue;

  @TypeGraphQL.Field(_type => GraphQLScalars.JSONResolver, {
    nullable: false
  })
  duringNetworkState!: Prisma.JsonValue;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: false
  })
  height!: number;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  fromEternalTransactionsHash!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  toEternalTransactionsHash!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  fromBlockHashRoot!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  fromMessagesHash!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  toMessagesHash!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  parentHash?: string | null;

  parent?: Block | null;

  successor?: Block | null;

  transactions?: TransactionExecutionResult[];

  result?: BlockResult | null;

  batch?: Batch | null;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: true
  })
  batchHeight?: number | null;

  @TypeGraphQL.Field(_type => BlockCount, {
    nullable: true
  })
  _count?: BlockCount | null;
}
