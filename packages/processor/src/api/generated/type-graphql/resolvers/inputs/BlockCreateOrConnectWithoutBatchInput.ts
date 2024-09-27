import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BlockCreateWithoutBatchInput } from "../inputs/BlockCreateWithoutBatchInput";
import { BlockWhereUniqueInput } from "../inputs/BlockWhereUniqueInput";

@TypeGraphQL.InputType("BlockCreateOrConnectWithoutBatchInput", {})
export class BlockCreateOrConnectWithoutBatchInput {
  @TypeGraphQL.Field(_type => BlockWhereUniqueInput, {
    nullable: false
  })
  where!: BlockWhereUniqueInput;

  @TypeGraphQL.Field(_type => BlockCreateWithoutBatchInput, {
    nullable: false
  })
  create!: BlockCreateWithoutBatchInput;
}
