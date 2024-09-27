import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { TransactionExecutionResultCreateManyBlockInputEnvelope } from "../inputs/TransactionExecutionResultCreateManyBlockInputEnvelope";
import { TransactionExecutionResultCreateOrConnectWithoutBlockInput } from "../inputs/TransactionExecutionResultCreateOrConnectWithoutBlockInput";
import { TransactionExecutionResultCreateWithoutBlockInput } from "../inputs/TransactionExecutionResultCreateWithoutBlockInput";
import { TransactionExecutionResultWhereUniqueInput } from "../inputs/TransactionExecutionResultWhereUniqueInput";

@TypeGraphQL.InputType("TransactionExecutionResultCreateNestedManyWithoutBlockInput", {})
export class TransactionExecutionResultCreateNestedManyWithoutBlockInput {
  @TypeGraphQL.Field(_type => [TransactionExecutionResultCreateWithoutBlockInput], {
    nullable: true
  })
  create?: TransactionExecutionResultCreateWithoutBlockInput[] | undefined;

  @TypeGraphQL.Field(_type => [TransactionExecutionResultCreateOrConnectWithoutBlockInput], {
    nullable: true
  })
  connectOrCreate?: TransactionExecutionResultCreateOrConnectWithoutBlockInput[] | undefined;

  @TypeGraphQL.Field(_type => TransactionExecutionResultCreateManyBlockInputEnvelope, {
    nullable: true
  })
  createMany?: TransactionExecutionResultCreateManyBlockInputEnvelope | undefined;

  @TypeGraphQL.Field(_type => [TransactionExecutionResultWhereUniqueInput], {
    nullable: true
  })
  connect?: TransactionExecutionResultWhereUniqueInput[] | undefined;
}
