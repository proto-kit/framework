import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BlockCreateOrConnectWithoutTransactionsInput } from "../inputs/BlockCreateOrConnectWithoutTransactionsInput";
import { BlockCreateWithoutTransactionsInput } from "../inputs/BlockCreateWithoutTransactionsInput";
import { BlockWhereUniqueInput } from "../inputs/BlockWhereUniqueInput";

@TypeGraphQL.InputType("BlockCreateNestedOneWithoutTransactionsInput", {})
export class BlockCreateNestedOneWithoutTransactionsInput {
  @TypeGraphQL.Field(_type => BlockCreateWithoutTransactionsInput, {
    nullable: true
  })
  create?: BlockCreateWithoutTransactionsInput | undefined;

  @TypeGraphQL.Field(_type => BlockCreateOrConnectWithoutTransactionsInput, {
    nullable: true
  })
  connectOrCreate?: BlockCreateOrConnectWithoutTransactionsInput | undefined;

  @TypeGraphQL.Field(_type => BlockWhereUniqueInput, {
    nullable: true
  })
  connect?: BlockWhereUniqueInput | undefined;
}
