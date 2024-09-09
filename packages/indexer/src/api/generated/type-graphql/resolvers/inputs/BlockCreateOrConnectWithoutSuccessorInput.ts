import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BlockCreateWithoutSuccessorInput } from "../inputs/BlockCreateWithoutSuccessorInput";
import { BlockWhereUniqueInput } from "../inputs/BlockWhereUniqueInput";

@TypeGraphQL.InputType("BlockCreateOrConnectWithoutSuccessorInput", {})
export class BlockCreateOrConnectWithoutSuccessorInput {
  @TypeGraphQL.Field(_type => BlockWhereUniqueInput, {
    nullable: false
  })
  where!: BlockWhereUniqueInput;

  @TypeGraphQL.Field(_type => BlockCreateWithoutSuccessorInput, {
    nullable: false
  })
  create!: BlockCreateWithoutSuccessorInput;
}
