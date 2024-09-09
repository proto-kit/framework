import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BlockCreateManyBatchInput } from "../inputs/BlockCreateManyBatchInput";

@TypeGraphQL.InputType("BlockCreateManyBatchInputEnvelope", {})
export class BlockCreateManyBatchInputEnvelope {
  @TypeGraphQL.Field(_type => [BlockCreateManyBatchInput], {
    nullable: false
  })
  data!: BlockCreateManyBatchInput[];

  @TypeGraphQL.Field(_type => Boolean, {
    nullable: true
  })
  skipDuplicates?: boolean | undefined;
}
