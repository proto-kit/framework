import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";

@TypeGraphQL.ObjectType("BlockResultMaxAggregate", {})
export class BlockResultMaxAggregate {
  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  blockHash!: string | null;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  stateRoot!: string | null;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  blockHashRoot!: string | null;
}
