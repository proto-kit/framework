import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { IncomingMessageBatchTransactionCreateManyTransactionInput } from "../inputs/IncomingMessageBatchTransactionCreateManyTransactionInput";

@TypeGraphQL.InputType("IncomingMessageBatchTransactionCreateManyTransactionInputEnvelope", {})
export class IncomingMessageBatchTransactionCreateManyTransactionInputEnvelope {
  @TypeGraphQL.Field(_type => [IncomingMessageBatchTransactionCreateManyTransactionInput], {
    nullable: false
  })
  data!: IncomingMessageBatchTransactionCreateManyTransactionInput[];

  @TypeGraphQL.Field(_type => Boolean, {
    nullable: true
  })
  skipDuplicates?: boolean | undefined;
}
