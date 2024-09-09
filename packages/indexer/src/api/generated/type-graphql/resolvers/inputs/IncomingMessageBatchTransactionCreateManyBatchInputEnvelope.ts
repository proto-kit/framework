import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { IncomingMessageBatchTransactionCreateManyBatchInput } from "../inputs/IncomingMessageBatchTransactionCreateManyBatchInput";

@TypeGraphQL.InputType("IncomingMessageBatchTransactionCreateManyBatchInputEnvelope", {})
export class IncomingMessageBatchTransactionCreateManyBatchInputEnvelope {
  @TypeGraphQL.Field(_type => [IncomingMessageBatchTransactionCreateManyBatchInput], {
    nullable: false
  })
  data!: IncomingMessageBatchTransactionCreateManyBatchInput[];

  @TypeGraphQL.Field(_type => Boolean, {
    nullable: true
  })
  skipDuplicates?: boolean | undefined;
}
