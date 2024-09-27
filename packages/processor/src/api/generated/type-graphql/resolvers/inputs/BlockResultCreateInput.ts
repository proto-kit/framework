import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BlockCreateNestedOneWithoutResultInput } from "../inputs/BlockCreateNestedOneWithoutResultInput";

@TypeGraphQL.InputType("BlockResultCreateInput", {})
export class BlockResultCreateInput {
  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  stateRoot!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  blockHashRoot!: string;

  @TypeGraphQL.Field(_type => GraphQLScalars.JSONResolver, {
    nullable: false
  })
  afterNetworkState!: Prisma.InputJsonValue;

  @TypeGraphQL.Field(_type => GraphQLScalars.JSONResolver, {
    nullable: false
  })
  blockStateTransitions!: Prisma.InputJsonValue;

  @TypeGraphQL.Field(_type => GraphQLScalars.JSONResolver, {
    nullable: false
  })
  blockHashWitness!: Prisma.InputJsonValue;

  @TypeGraphQL.Field(_type => BlockCreateNestedOneWithoutResultInput, {
    nullable: true
  })
  block?: BlockCreateNestedOneWithoutResultInput | undefined;
}
