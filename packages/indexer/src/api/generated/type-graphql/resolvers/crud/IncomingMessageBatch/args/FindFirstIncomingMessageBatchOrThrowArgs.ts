import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { IncomingMessageBatchOrderByWithRelationInput } from "../../../inputs/IncomingMessageBatchOrderByWithRelationInput";
import { IncomingMessageBatchWhereInput } from "../../../inputs/IncomingMessageBatchWhereInput";
import { IncomingMessageBatchWhereUniqueInput } from "../../../inputs/IncomingMessageBatchWhereUniqueInput";
import { IncomingMessageBatchScalarFieldEnum } from "../../../../enums/IncomingMessageBatchScalarFieldEnum";

@TypeGraphQL.ArgsType()
export class FindFirstIncomingMessageBatchOrThrowArgs {
  @TypeGraphQL.Field(_type => IncomingMessageBatchWhereInput, {
    nullable: true
  })
  where?: IncomingMessageBatchWhereInput | undefined;

  @TypeGraphQL.Field(_type => [IncomingMessageBatchOrderByWithRelationInput], {
    nullable: true
  })
  orderBy?: IncomingMessageBatchOrderByWithRelationInput[] | undefined;

  @TypeGraphQL.Field(_type => IncomingMessageBatchWhereUniqueInput, {
    nullable: true
  })
  cursor?: IncomingMessageBatchWhereUniqueInput | undefined;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: true
  })
  take?: number | undefined;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: true
  })
  skip?: number | undefined;

  @TypeGraphQL.Field(_type => [IncomingMessageBatchScalarFieldEnum], {
    nullable: true
  })
  distinct?: Array<"id" | "fromMessageHash" | "toMessageHash"> | undefined;
}
