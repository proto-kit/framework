import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { IntFilter } from "../inputs/IntFilter";
import { StringFilter } from "../inputs/StringFilter";

@TypeGraphQL.InputType("IncomingMessageBatchTransactionScalarWhereInput", {})
export class IncomingMessageBatchTransactionScalarWhereInput {
  @TypeGraphQL.Field(_type => [IncomingMessageBatchTransactionScalarWhereInput], {
    nullable: true
  })
  AND?: IncomingMessageBatchTransactionScalarWhereInput[] | undefined;

  @TypeGraphQL.Field(_type => [IncomingMessageBatchTransactionScalarWhereInput], {
    nullable: true
  })
  OR?: IncomingMessageBatchTransactionScalarWhereInput[] | undefined;

  @TypeGraphQL.Field(_type => [IncomingMessageBatchTransactionScalarWhereInput], {
    nullable: true
  })
  NOT?: IncomingMessageBatchTransactionScalarWhereInput[] | undefined;

  @TypeGraphQL.Field(_type => StringFilter, {
    nullable: true
  })
  transactionHash?: StringFilter | undefined;

  @TypeGraphQL.Field(_type => IntFilter, {
    nullable: true
  })
  batchId?: IntFilter | undefined;
}
