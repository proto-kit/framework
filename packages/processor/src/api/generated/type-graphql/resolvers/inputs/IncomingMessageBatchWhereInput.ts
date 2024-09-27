import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { IncomingMessageBatchTransactionListRelationFilter } from "../inputs/IncomingMessageBatchTransactionListRelationFilter";
import { IntFilter } from "../inputs/IntFilter";
import { StringFilter } from "../inputs/StringFilter";

@TypeGraphQL.InputType("IncomingMessageBatchWhereInput", {})
export class IncomingMessageBatchWhereInput {
  @TypeGraphQL.Field(_type => [IncomingMessageBatchWhereInput], {
    nullable: true
  })
  AND?: IncomingMessageBatchWhereInput[] | undefined;

  @TypeGraphQL.Field(_type => [IncomingMessageBatchWhereInput], {
    nullable: true
  })
  OR?: IncomingMessageBatchWhereInput[] | undefined;

  @TypeGraphQL.Field(_type => [IncomingMessageBatchWhereInput], {
    nullable: true
  })
  NOT?: IncomingMessageBatchWhereInput[] | undefined;

  @TypeGraphQL.Field(_type => IntFilter, {
    nullable: true
  })
  id?: IntFilter | undefined;

  @TypeGraphQL.Field(_type => StringFilter, {
    nullable: true
  })
  fromMessageHash?: StringFilter | undefined;

  @TypeGraphQL.Field(_type => StringFilter, {
    nullable: true
  })
  toMessageHash?: StringFilter | undefined;

  @TypeGraphQL.Field(_type => IncomingMessageBatchTransactionListRelationFilter, {
    nullable: true
  })
  messages?: IncomingMessageBatchTransactionListRelationFilter | undefined;
}
