import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../scalars";
import { Batch } from "../models/Batch";
import { SettlementCount } from "../resolvers/outputs/SettlementCount";

@TypeGraphQL.ObjectType("Settlement", {})
export class Settlement {
  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  transactionHash!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  promisedMessagesHash!: string;

  batches?: Batch[];

  @TypeGraphQL.Field(_type => SettlementCount, {
    nullable: true
  })
  _count?: SettlementCount | null;
}
