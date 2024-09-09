import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";

@TypeGraphQL.ObjectType("CreateManyAndReturnTransaction", {})
export class CreateManyAndReturnTransaction {
  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  hash!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  methodId!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  sender!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  nonce!: string;

  @TypeGraphQL.Field(_type => [String], {
    nullable: true
  })
  argsFields!: string[] | null;

  @TypeGraphQL.Field(_type => [String], {
    nullable: true
  })
  auxiliaryData!: string[] | null;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  signature_r!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  signature_s!: string;

  @TypeGraphQL.Field(_type => Boolean, {
    nullable: false
  })
  isMessage!: boolean;
}
