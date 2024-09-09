import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../scalars";
import { Block } from "../models/Block";
import { Settlement } from "../models/Settlement";
import { BatchCount } from "../resolvers/outputs/BatchCount";

@TypeGraphQL.ObjectType("Batch", {})
export class Batch {
  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: false
  })
  height!: number;

  @TypeGraphQL.Field(_type => GraphQLScalars.JSONResolver, {
    nullable: false
  })
  proof!: Prisma.JsonValue;

  blocks?: Block[];

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  settlementTransactionHash?: string | null;

  settlement?: Settlement | null;

  @TypeGraphQL.Field(_type => BatchCount, {
    nullable: true
  })
  _count?: BatchCount | null;
}
