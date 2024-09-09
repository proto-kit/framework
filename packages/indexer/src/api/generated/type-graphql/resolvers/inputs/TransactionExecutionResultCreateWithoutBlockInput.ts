import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { TransactionCreateNestedOneWithoutExecutionResultInput } from "../inputs/TransactionCreateNestedOneWithoutExecutionResultInput";

@TypeGraphQL.InputType("TransactionExecutionResultCreateWithoutBlockInput", {})
export class TransactionExecutionResultCreateWithoutBlockInput {
  @TypeGraphQL.Field(_type => GraphQLScalars.JSONResolver, {
    nullable: false
  })
  stateTransitions!: Prisma.InputJsonValue;

  @TypeGraphQL.Field(_type => GraphQLScalars.JSONResolver, {
    nullable: false
  })
  protocolTransitions!: Prisma.InputJsonValue;

  @TypeGraphQL.Field(_type => Boolean, {
    nullable: false
  })
  status!: boolean;

  @TypeGraphQL.Field(_type => String, {
    nullable: true
  })
  statusMessage?: string | undefined;

  @TypeGraphQL.Field(_type => TransactionCreateNestedOneWithoutExecutionResultInput, {
    nullable: false
  })
  tx!: TransactionCreateNestedOneWithoutExecutionResultInput;
}
