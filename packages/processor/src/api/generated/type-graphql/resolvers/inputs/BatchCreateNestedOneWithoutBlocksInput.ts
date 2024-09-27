import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BatchCreateOrConnectWithoutBlocksInput } from "../inputs/BatchCreateOrConnectWithoutBlocksInput";
import { BatchCreateWithoutBlocksInput } from "../inputs/BatchCreateWithoutBlocksInput";
import { BatchWhereUniqueInput } from "../inputs/BatchWhereUniqueInput";

@TypeGraphQL.InputType("BatchCreateNestedOneWithoutBlocksInput", {})
export class BatchCreateNestedOneWithoutBlocksInput {
  @TypeGraphQL.Field(_type => BatchCreateWithoutBlocksInput, {
    nullable: true
  })
  create?: BatchCreateWithoutBlocksInput | undefined;

  @TypeGraphQL.Field(_type => BatchCreateOrConnectWithoutBlocksInput, {
    nullable: true
  })
  connectOrCreate?: BatchCreateOrConnectWithoutBlocksInput | undefined;

  @TypeGraphQL.Field(_type => BatchWhereUniqueInput, {
    nullable: true
  })
  connect?: BatchWhereUniqueInput | undefined;
}
