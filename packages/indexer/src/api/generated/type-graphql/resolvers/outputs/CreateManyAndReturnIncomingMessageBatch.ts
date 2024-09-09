import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";

@TypeGraphQL.ObjectType("CreateManyAndReturnIncomingMessageBatch", {})
export class CreateManyAndReturnIncomingMessageBatch {
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
}
