import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { TransactionExecutionResultCreateManyBlockInput } from "../inputs/TransactionExecutionResultCreateManyBlockInput";

@TypeGraphQL.InputType("TransactionExecutionResultCreateManyBlockInputEnvelope", {})
export class TransactionExecutionResultCreateManyBlockInputEnvelope {
  @TypeGraphQL.Field(_type => [TransactionExecutionResultCreateManyBlockInput], {
    nullable: false
  })
  data!: TransactionExecutionResultCreateManyBlockInput[];

  @TypeGraphQL.Field(_type => Boolean, {
    nullable: true
  })
  skipDuplicates?: boolean | undefined;
}
