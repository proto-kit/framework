import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { TransactionWhereInput } from "../../../inputs/TransactionWhereInput";

@TypeGraphQL.ArgsType()
export class DeleteManyTransactionArgs {
  @TypeGraphQL.Field(_type => TransactionWhereInput, {
    nullable: true
  })
  where?: TransactionWhereInput | undefined;
}
