import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BlockCreateNestedOneWithoutParentInput } from "../inputs/BlockCreateNestedOneWithoutParentInput";
import { BlockCreateNestedOneWithoutSuccessorInput } from "../inputs/BlockCreateNestedOneWithoutSuccessorInput";
import { BlockResultCreateNestedOneWithoutBlockInput } from "../inputs/BlockResultCreateNestedOneWithoutBlockInput";
import { TransactionExecutionResultCreateNestedManyWithoutBlockInput } from "../inputs/TransactionExecutionResultCreateNestedManyWithoutBlockInput";

@TypeGraphQL.InputType("BlockCreateWithoutBatchInput", {})
export class BlockCreateWithoutBatchInput {
  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  hash!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  transactionsHash!: string;

  @TypeGraphQL.Field(_type => GraphQLScalars.JSONResolver, {
    nullable: false
  })
  beforeNetworkState!: Prisma.InputJsonValue;

  @TypeGraphQL.Field(_type => GraphQLScalars.JSONResolver, {
    nullable: false
  })
  duringNetworkState!: Prisma.InputJsonValue;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: false
  })
  height!: number;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  fromEternalTransactionsHash!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  toEternalTransactionsHash!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  fromBlockHashRoot!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  fromMessagesHash!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  toMessagesHash!: string;

  @TypeGraphQL.Field(_type => BlockCreateNestedOneWithoutSuccessorInput, {
    nullable: true
  })
  parent?: BlockCreateNestedOneWithoutSuccessorInput | undefined;

  @TypeGraphQL.Field(_type => BlockCreateNestedOneWithoutParentInput, {
    nullable: true
  })
  successor?: BlockCreateNestedOneWithoutParentInput | undefined;

  @TypeGraphQL.Field(_type => TransactionExecutionResultCreateNestedManyWithoutBlockInput, {
    nullable: true
  })
  transactions?: TransactionExecutionResultCreateNestedManyWithoutBlockInput | undefined;

  @TypeGraphQL.Field(_type => BlockResultCreateNestedOneWithoutBlockInput, {
    nullable: true
  })
  result?: BlockResultCreateNestedOneWithoutBlockInput | undefined;
}
