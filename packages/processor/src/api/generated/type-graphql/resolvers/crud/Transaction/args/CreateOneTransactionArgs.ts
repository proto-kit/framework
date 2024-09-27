import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { TransactionCreateInput } from "../../../inputs/TransactionCreateInput";

@TypeGraphQL.ArgsType()
export class CreateOneTransactionArgs {
  @TypeGraphQL.Field(_type => TransactionCreateInput, {
    nullable: false
  })
  data!: TransactionCreateInput;
}
