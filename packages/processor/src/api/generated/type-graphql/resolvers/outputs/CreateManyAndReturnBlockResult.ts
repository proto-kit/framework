import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { CreateManyAndReturnBlockResultBlockArgs } from "./args/CreateManyAndReturnBlockResultBlockArgs";
import { Block } from "../../models/Block";

@TypeGraphQL.ObjectType("CreateManyAndReturnBlockResult", {})
export class CreateManyAndReturnBlockResult {
  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  blockHash!: string;

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
  afterNetworkState!: Prisma.JsonValue;

  @TypeGraphQL.Field(_type => GraphQLScalars.JSONResolver, {
    nullable: false
  })
  blockStateTransitions!: Prisma.JsonValue;

  @TypeGraphQL.Field(_type => GraphQLScalars.JSONResolver, {
    nullable: false
  })
  blockHashWitness!: Prisma.JsonValue;

  block!: Block | null;

  @TypeGraphQL.Field(_type => Block, {
    name: "block",
    nullable: true
  })
  getBlock(@TypeGraphQL.Root() root: CreateManyAndReturnBlockResult, @TypeGraphQL.Args() args: CreateManyAndReturnBlockResultBlockArgs): Block | null {
    return root.block;
  }
}
