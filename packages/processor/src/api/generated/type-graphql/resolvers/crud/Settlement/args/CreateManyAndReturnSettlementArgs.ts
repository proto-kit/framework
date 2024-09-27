import * as TypeGraphQL from "type-graphql";
import * as GraphQLScalars from "graphql-scalars";
import { SettlementCreateManyInput } from "../../../inputs/SettlementCreateManyInput";

@TypeGraphQL.ArgsType()
export class CreateManyAndReturnSettlementArgs {
  @TypeGraphQL.Field(_type => [SettlementCreateManyInput], {
    nullable: false
  })
  data!: SettlementCreateManyInput[];

  @TypeGraphQL.Field(_type => Boolean, {
    nullable: true
  })
  skipDuplicates?: boolean | undefined;
}
