import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../scalars";
import { Block } from "../models/Block";
import { Transaction } from "../models/Transaction";

@TypeGraphQL.ObjectType("TransactionExecutionResult", {})
export class TransactionExecutionResult {
  @TypeGraphQL.Field(_type => GraphQLScalars.JSONResolver, {
    nullable: false
  })
  stateTransitions!: Prisma.JsonValue;

  @TypeGraphQL.Field(_type => GraphQLScalars.JSONResolver, {
    nullable: false
  })
  protocolTransitions!: Prisma.JsonValue;

  @TypeGraphQL.Field(_type => Boolean, {
    nullable: false
  })
  status!: boolean;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  statusMessage?: string | null;

  tx?: Transaction;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  txHash!: string;

  block?: Block;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  blockHash!: string;
}
