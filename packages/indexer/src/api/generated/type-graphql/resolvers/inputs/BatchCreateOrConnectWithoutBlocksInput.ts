import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BatchCreateWithoutBlocksInput } from "../inputs/BatchCreateWithoutBlocksInput";
import { BatchWhereUniqueInput } from "../inputs/BatchWhereUniqueInput";

@TypeGraphQL.InputType("BatchCreateOrConnectWithoutBlocksInput", {})
export class BatchCreateOrConnectWithoutBlocksInput {
  @TypeGraphQL.Field(_type => BatchWhereUniqueInput, {
    nullable: false
  })
  where!: BatchWhereUniqueInput;

  @TypeGraphQL.Field(_type => BatchCreateWithoutBlocksInput, {
    nullable: false
  })
  create!: BatchCreateWithoutBlocksInput;
}
