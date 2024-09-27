import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";

@TypeGraphQL.InputType("StateUpdatevaluesInput", {})
export class StateUpdatevaluesInput {
  @TypeGraphQL.Field(_type => [DecimalJSScalar], {
    nullable: true
  })
  set?: Prisma.Decimal[] | undefined;

  @TypeGraphQL.Field(_type => [DecimalJSScalar], {
    nullable: true
  })
  push?: Prisma.Decimal[] | undefined;
}
