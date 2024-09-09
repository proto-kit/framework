import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";

@TypeGraphQL.ObjectType("TransactionMaxAggregate", {})
export class TransactionMaxAggregate {
  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  hash!: string | null;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  methodId!: string | null;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  sender!: string | null;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  nonce!: string | null;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  signature_r!: string | null;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  signature_s!: string | null;

  @TypeGraphQL.Field(_type => Boolean, {
    nullable: true
  })
  isMessage!: boolean | null;
}
