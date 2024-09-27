import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BlockCreateWithoutResultInput } from "../inputs/BlockCreateWithoutResultInput";
import { BlockWhereUniqueInput } from "../inputs/BlockWhereUniqueInput";

@TypeGraphQL.InputType("BlockCreateOrConnectWithoutResultInput", {})
export class BlockCreateOrConnectWithoutResultInput {
  @TypeGraphQL.Field(_type => BlockWhereUniqueInput, {
    nullable: false
  })
  where!: BlockWhereUniqueInput;

  @TypeGraphQL.Field(_type => BlockCreateWithoutResultInput, {
    nullable: false
  })
  create!: BlockCreateWithoutResultInput;
}
