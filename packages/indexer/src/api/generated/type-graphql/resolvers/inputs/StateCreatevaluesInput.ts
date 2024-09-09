import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";

@TypeGraphQL.InputType("StateCreatevaluesInput", {})
export class StateCreatevaluesInput {
  @TypeGraphQL.Field(_type => [DecimalJSScalar], {
    nullable: false
  })
  set!: Prisma.Decimal[];
}
