import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { Prisma } from "../../../../../../node_modules/@prisma/client-indexer";
import { DecimalJSScalar } from "../../scalars";
import { BatchCreateManySettlementInputEnvelope } from "../inputs/BatchCreateManySettlementInputEnvelope";
import { BatchCreateOrConnectWithoutSettlementInput } from "../inputs/BatchCreateOrConnectWithoutSettlementInput";
import { BatchCreateWithoutSettlementInput } from "../inputs/BatchCreateWithoutSettlementInput";
import { BatchWhereUniqueInput } from "../inputs/BatchWhereUniqueInput";

@TypeGraphQL.InputType("BatchCreateNestedManyWithoutSettlementInput", {})
export class BatchCreateNestedManyWithoutSettlementInput {
  @TypeGraphQL.Field(_type => [BatchCreateWithoutSettlementInput], {
    nullable: true
  })
  create?: BatchCreateWithoutSettlementInput[] | undefined;

  @TypeGraphQL.Field(_type => [BatchCreateOrConnectWithoutSettlementInput], {
    nullable: true
  })
  connectOrCreate?: BatchCreateOrConnectWithoutSettlementInput[] | undefined;

  @TypeGraphQL.Field(_type => BatchCreateManySettlementInputEnvelope, {
    nullable: true
  })
  createMany?: BatchCreateManySettlementInputEnvelope | undefined;

  @TypeGraphQL.Field(_type => [BatchWhereUniqueInput], {
    nullable: true
  })
  connect?: BatchWhereUniqueInput[] | undefined;
}
