import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { Block } from "../../models/Block";
import { Transaction } from "../../models/Transaction";

@TypeGraphQL.ObjectType("CreateManyAndReturnTransactionExecutionResult", {})
export class CreateManyAndReturnTransactionExecutionResult {
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
  statusMessage!: string | null;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  txHash!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  blockHash!: string;

  @TypeGraphQL.Field(_type => Transaction, {
    nullable: false
  })
  tx!: Transaction;

  @TypeGraphQL.Field(_type => Block, {
    nullable: false
  })
  block!: Block;
}
