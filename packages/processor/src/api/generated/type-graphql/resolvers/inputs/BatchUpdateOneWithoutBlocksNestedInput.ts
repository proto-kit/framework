import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BatchCreateOrConnectWithoutBlocksInput } from "../inputs/BatchCreateOrConnectWithoutBlocksInput";
import { BatchCreateWithoutBlocksInput } from "../inputs/BatchCreateWithoutBlocksInput";
import { BatchUpdateToOneWithWhereWithoutBlocksInput } from "../inputs/BatchUpdateToOneWithWhereWithoutBlocksInput";
import { BatchUpsertWithoutBlocksInput } from "../inputs/BatchUpsertWithoutBlocksInput";
import { BatchWhereInput } from "../inputs/BatchWhereInput";
import { BatchWhereUniqueInput } from "../inputs/BatchWhereUniqueInput";

@TypeGraphQL.InputType("BatchUpdateOneWithoutBlocksNestedInput", {})
export class BatchUpdateOneWithoutBlocksNestedInput {
  @TypeGraphQL.Field(_type => BatchCreateWithoutBlocksInput, {
    nullable: true
  })
  create?: BatchCreateWithoutBlocksInput | undefined;

  @TypeGraphQL.Field(_type => BatchCreateOrConnectWithoutBlocksInput, {
    nullable: true
  })
  connectOrCreate?: BatchCreateOrConnectWithoutBlocksInput | undefined;

  @TypeGraphQL.Field(_type => BatchUpsertWithoutBlocksInput, {
    nullable: true
  })
  upsert?: BatchUpsertWithoutBlocksInput | undefined;

  @TypeGraphQL.Field(_type => BatchWhereInput, {
    nullable: true
  })
  disconnect?: BatchWhereInput | undefined;

  @TypeGraphQL.Field(_type => BatchWhereInput, {
    nullable: true
  })
  delete?: BatchWhereInput | undefined;

  @TypeGraphQL.Field(_type => BatchWhereUniqueInput, {
    nullable: true
  })
  connect?: BatchWhereUniqueInput | undefined;

  @TypeGraphQL.Field(_type => BatchUpdateToOneWithWhereWithoutBlocksInput, {
    nullable: true
  })
  update?: BatchUpdateToOneWithWhereWithoutBlocksInput | undefined;
}
