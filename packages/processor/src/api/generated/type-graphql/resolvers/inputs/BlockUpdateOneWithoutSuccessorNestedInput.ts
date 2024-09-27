import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BlockCreateOrConnectWithoutSuccessorInput } from "../inputs/BlockCreateOrConnectWithoutSuccessorInput";
import { BlockCreateWithoutSuccessorInput } from "../inputs/BlockCreateWithoutSuccessorInput";
import { BlockUpdateToOneWithWhereWithoutSuccessorInput } from "../inputs/BlockUpdateToOneWithWhereWithoutSuccessorInput";
import { BlockUpsertWithoutSuccessorInput } from "../inputs/BlockUpsertWithoutSuccessorInput";
import { BlockWhereInput } from "../inputs/BlockWhereInput";
import { BlockWhereUniqueInput } from "../inputs/BlockWhereUniqueInput";

@TypeGraphQL.InputType("BlockUpdateOneWithoutSuccessorNestedInput", {})
export class BlockUpdateOneWithoutSuccessorNestedInput {
  @TypeGraphQL.Field(_type => BlockCreateWithoutSuccessorInput, {
    nullable: true
  })
  create?: BlockCreateWithoutSuccessorInput | undefined;

  @TypeGraphQL.Field(_type => BlockCreateOrConnectWithoutSuccessorInput, {
    nullable: true
  })
  connectOrCreate?: BlockCreateOrConnectWithoutSuccessorInput | undefined;

  @TypeGraphQL.Field(_type => BlockUpsertWithoutSuccessorInput, {
    nullable: true
  })
  upsert?: BlockUpsertWithoutSuccessorInput | undefined;

  @TypeGraphQL.Field(_type => BlockWhereInput, {
    nullable: true
  })
  disconnect?: BlockWhereInput | undefined;

  @TypeGraphQL.Field(_type => BlockWhereInput, {
    nullable: true
  })
  delete?: BlockWhereInput | undefined;

  @TypeGraphQL.Field(_type => BlockWhereUniqueInput, {
    nullable: true
  })
  connect?: BlockWhereUniqueInput | undefined;

  @TypeGraphQL.Field(_type => BlockUpdateToOneWithWhereWithoutSuccessorInput, {
    nullable: true
  })
  update?: BlockUpdateToOneWithWhereWithoutSuccessorInput | undefined;
}
