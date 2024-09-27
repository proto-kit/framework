import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";

@TypeGraphQL.InputType("IncomingMessageBatchCreateManyInput", {})
export class IncomingMessageBatchCreateManyInput {
  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: true
  })
  id?: number | undefined;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  fromMessageHash!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  toMessageHash!: string;
}
