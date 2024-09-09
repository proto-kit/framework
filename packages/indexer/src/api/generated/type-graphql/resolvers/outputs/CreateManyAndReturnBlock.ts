import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { CreateManyAndReturnBlockBatchArgs } from "./args/CreateManyAndReturnBlockBatchArgs";
import { CreateManyAndReturnBlockParentArgs } from "./args/CreateManyAndReturnBlockParentArgs";
import { Batch } from "../../models/Batch";
import { Block } from "../../models/Block";

@TypeGraphQL.ObjectType("CreateManyAndReturnBlock", {})
export class CreateManyAndReturnBlock {
  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  hash!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  transactionsHash!: string;

  @TypeGraphQL.Field(_type => GraphQLScalars.JSONResolver, {
    nullable: false
  })
  beforeNetworkState!: Prisma.JsonValue;

  @TypeGraphQL.Field(_type => GraphQLScalars.JSONResolver, {
    nullable: false
  })
  duringNetworkState!: Prisma.JsonValue;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: false
  })
  height!: number;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  fromEternalTransactionsHash!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  toEternalTransactionsHash!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  fromBlockHashRoot!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  fromMessagesHash!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: false
  })
  toMessagesHash!: string;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  parentHash!: string | null;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    nullable: true
  })
  batchHeight!: number | null;

  parent!: Block | null;
  batch!: Batch | null;

  @TypeGraphQL.Field(_type => Block, {
    name: "parent",
    nullable: true
  })
  getParent(@TypeGraphQL.Root() root: CreateManyAndReturnBlock, @TypeGraphQL.Args() args: CreateManyAndReturnBlockParentArgs): Block | null {
    return root.parent;
  }

  @TypeGraphQL.Field(_type => Batch, {
    name: "batch",
    nullable: true
  })
  getBatch(@TypeGraphQL.Root() root: CreateManyAndReturnBlock, @TypeGraphQL.Args() args: CreateManyAndReturnBlockBatchArgs): Batch | null {
    return root.batch;
  }
}
