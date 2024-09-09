import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { SettlementUpdateManyMutationInput } from "../../../inputs/SettlementUpdateManyMutationInput";
import { SettlementWhereInput } from "../../../inputs/SettlementWhereInput";

@TypeGraphQL.ArgsType()
export class UpdateManySettlementArgs {
  @TypeGraphQL.Field(_type => SettlementUpdateManyMutationInput, {
    nullable: false
  })
  data!: SettlementUpdateManyMutationInput;

  @TypeGraphQL.Field(_type => SettlementWhereInput, {
    nullable: true
  })
  where?: SettlementWhereInput | undefined;
}
