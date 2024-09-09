import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BatchCountBlocksArgs } from "./args/BatchCountBlocksArgs";

@TypeGraphQL.ObjectType("BatchCount", {})
export class BatchCount {
  blocks!: number;

  @TypeGraphQL.Field(_type => TypeGraphQL.Int, {
    name: "blocks",
    nullable: false
  })
  getBlocks(@TypeGraphQL.Root() root: BatchCount, @TypeGraphQL.Args() args: BatchCountBlocksArgs): number {
    return root.blocks;
  }
}
