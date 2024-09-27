import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";

@TypeGraphQL.ObjectType("BlockMaxAggregate", {})
export class BlockMaxAggregate {
  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  hash!: string | null;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  transactionsHash!: string | null;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: true
  })
  height!: number | null;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  fromEternalTransactionsHash!: string | null;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  toEternalTransactionsHash!: string | null;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  fromBlockHashRoot!: string | null;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  fromMessagesHash!: string | null;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  toMessagesHash!: string | null;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  parentHash!: string | null;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: true
  })
  batchHeight!: number | null;
}
