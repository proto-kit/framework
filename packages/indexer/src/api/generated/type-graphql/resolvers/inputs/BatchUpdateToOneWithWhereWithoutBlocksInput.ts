import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BatchUpdateWithoutBlocksInput } from "../inputs/BatchUpdateWithoutBlocksInput";
import { BatchWhereInput } from "../inputs/BatchWhereInput";

@TypeGraphQL.InputType("BatchUpdateToOneWithWhereWithoutBlocksInput", {})
export class BatchUpdateToOneWithWhereWithoutBlocksInput {
  @TypeGraphQL.Field(_type => BatchWhereInput, {
    nullable: true
  })
  where?: BatchWhereInput | undefined;

  @TypeGraphQL.Field(_type => BatchUpdateWithoutBlocksInput, {
    nullable: false
  })
  data!: BatchUpdateWithoutBlocksInput;
}
