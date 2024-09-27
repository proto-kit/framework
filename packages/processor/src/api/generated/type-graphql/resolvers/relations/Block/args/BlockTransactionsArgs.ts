import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { TransactionExecutionResultOrderByWithRelationInput } from "../../../inputs/TransactionExecutionResultOrderByWithRelationInput";
import { TransactionExecutionResultWhereInput } from "../../../inputs/TransactionExecutionResultWhereInput";
import { TransactionExecutionResultWhereUniqueInput } from "../../../inputs/TransactionExecutionResultWhereUniqueInput";
import { TransactionExecutionResultScalarFieldEnum } from "../../../../enums/TransactionExecutionResultScalarFieldEnum";

@TypeGraphQL.ArgsType()
export class BlockTransactionsArgs {
  @TypeGraphQL.Field(_type => TransactionExecutionResultWhereInput, {
    nullable: true
  })
  where?: TransactionExecutionResultWhereInput | undefined;

  @TypeGraphQL.Field(_type => [TransactionExecutionResultOrderByWithRelationInput], {
    nullable: true
  })
  orderBy?: TransactionExecutionResultOrderByWithRelationInput[] | undefined;

  @TypeGraphQL.Field(_type => TransactionExecutionResultWhereUniqueInput, {
    nullable: true
  })
  cursor?: TransactionExecutionResultWhereUniqueInput | undefined;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: true
  })
  take?: number | undefined;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: true
  })
  skip?: number | undefined;

  @TypeGraphQL.Field(_type => [TransactionExecutionResultScalarFieldEnum], {
    nullable: true
  })
  distinct?: Array<"stateTransitions" | "protocolTransitions" | "status" | "statusMessage" | "txHash" | "blockHash"> | undefined;
}
