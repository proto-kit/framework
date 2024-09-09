import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../scalars";
import { IncomingMessageBatchTransaction } from "../models/IncomingMessageBatchTransaction";
import { IncomingMessageBatchCount } from "../resolvers/outputs/IncomingMessageBatchCount";

@TypeGraphQL.ObjectType("IncomingMessageBatch", {})
export class IncomingMessageBatch {
  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: false
  })
  id!: number;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  fromMessageHash!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  toMessageHash!: string;

  messages?: IncomingMessageBatchTransaction[];

  @TypeGraphQL.Field(_type => IncomingMessageBatchCount, {
    nullable: true
  })
  _count?: IncomingMessageBatchCount | null;
}
