import { SchemaGeneratingGraphqlModule } from "../GraphqlModule";
import { inject, injectable } from "tsyringe";
import { Resolver } from "type-graphql";
import { GraphQLObjectType, GraphQLSchema, GraphQLString } from "graphql/type";
import { Runtime, RuntimeModulesRecord } from "@proto-kit/module";
import { Protocol, ProtocolModulesRecord } from "@proto-kit/protocol";

@injectable()
@Resolver()
export class QueryGraphqlModule extends SchemaGeneratingGraphqlModule<object> {
  public resolverType = QueryGraphqlModule;

  public constructor(
    @inject("Runtime") private readonly runtime: Runtime<RuntimeModulesRecord>,
    // @inject("Protocol") private readonly protocol: Protocol<ProtocolModulesRecord>
  ) {
    super();
  }

  public generateSchema(): GraphQLSchema {
    var userType = new GraphQLObjectType({
      name: "User",
      fields: {
        id: { type: GraphQLString },
        name: { type: GraphQLString },
      },
    })

    const queryType = new GraphQLObjectType({
      name: "Query",
      fields: {
        user: {
          type: userType,
          // `args` describes the arguments that the `user` query accepts
          args: {
            // id: { type: GraphQLString },
          },
          resolve: (_) => {
            return {
              id: "123",
              name: "Peter",
            }
          },
        },
      },
    });

    return new GraphQLSchema({ query: queryType })
  }
}