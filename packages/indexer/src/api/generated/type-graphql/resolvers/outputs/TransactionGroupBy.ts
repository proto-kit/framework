import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { TransactionCountAggregate } from "../outputs/TransactionCountAggregate";
import { TransactionMaxAggregate } from "../outputs/TransactionMaxAggregate";
import { TransactionMinAggregate } from "../outputs/TransactionMinAggregate";

@TypeGraphQL.ObjectType("TransactionGroupBy", {})
export class TransactionGroupBy {
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

  @TypeGraphQL.Field(_type => TransactionCountAggregate, {
    nullable: true
  })
  _count!: TransactionCountAggregate | null;

  @TypeGraphQL.Field(_type => TransactionMinAggregate, {
    nullable: true
  })
  _min!: TransactionMinAggregate | null;

  @TypeGraphQL.Field(_type => TransactionMaxAggregate, {
    nullable: true
  })
  _max!: TransactionMaxAggregate | null;
}
