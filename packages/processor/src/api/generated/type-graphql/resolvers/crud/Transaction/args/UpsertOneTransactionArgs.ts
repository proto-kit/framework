import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { TransactionCreateInput } from "../../../inputs/TransactionCreateInput";
import { TransactionUpdateInput } from "../../../inputs/TransactionUpdateInput";
import { TransactionWhereUniqueInput } from "../../../inputs/TransactionWhereUniqueInput";

@TypeGraphQL.ArgsType()
export class UpsertOneTransactionArgs {
  @TypeGraphQL.Field(_type => TransactionWhereUniqueInput, {
    nullable: false
  })
  where!: TransactionWhereUniqueInput;

  @TypeGraphQL.Field(_type => TransactionCreateInput, {
    nullable: false
  })
  create!: TransactionCreateInput;

  @TypeGraphQL.Field(_type => TransactionUpdateInput, {
    nullable: false
  })
  update!: TransactionUpdateInput;
}
