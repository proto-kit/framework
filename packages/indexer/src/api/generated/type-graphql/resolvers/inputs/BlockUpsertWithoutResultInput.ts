import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BlockCreateWithoutResultInput } from "../inputs/BlockCreateWithoutResultInput";
import { BlockUpdateWithoutResultInput } from "../inputs/BlockUpdateWithoutResultInput";
import { BlockWhereInput } from "../inputs/BlockWhereInput";

@TypeGraphQL.InputType("BlockUpsertWithoutResultInput", {})
export class BlockUpsertWithoutResultInput {
  @TypeGraphQL.Field(_type => BlockUpdateWithoutResultInput, {
    nullable: false
  })
  update!: BlockUpdateWithoutResultInput;

  @TypeGraphQL.Field(_type => BlockCreateWithoutResultInput, {
    nullable: false
  })
  create!: BlockCreateWithoutResultInput;

  @TypeGraphQL.Field(_type => BlockWhereInput, {
    nullable: true
  })
  where?: BlockWhereInput | undefined;
}
