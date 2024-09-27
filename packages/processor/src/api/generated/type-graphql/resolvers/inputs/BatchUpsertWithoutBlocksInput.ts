import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BatchCreateWithoutBlocksInput } from "../inputs/BatchCreateWithoutBlocksInput";
import { BatchUpdateWithoutBlocksInput } from "../inputs/BatchUpdateWithoutBlocksInput";
import { BatchWhereInput } from "../inputs/BatchWhereInput";

@TypeGraphQL.InputType("BatchUpsertWithoutBlocksInput", {})
export class BatchUpsertWithoutBlocksInput {
  @TypeGraphQL.Field(_type => BatchUpdateWithoutBlocksInput, {
    nullable: false
  })
  update!: BatchUpdateWithoutBlocksInput;

  @TypeGraphQL.Field(_type => BatchCreateWithoutBlocksInput, {
    nullable: false
  })
  create!: BatchCreateWithoutBlocksInput;

  @TypeGraphQL.Field(_type => BatchWhereInput, {
    nullable: true
  })
  where?: BatchWhereInput | undefined;
}
