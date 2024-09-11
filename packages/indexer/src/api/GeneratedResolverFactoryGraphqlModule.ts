import {
  GraphqlServer,
  ResolverFactoryGraphqlModule,
  graphqlModule,
} from "@proto-kit/api";
import { NonEmptyArray } from "type-graphql";
import { inject } from "tsyringe";
// eslint-disable-next-line import/no-extraneous-dependencies
import { PrismaClient } from "@prisma/client-indexer";

import {
  AggregateBlockResolver,
  AggregateBlockResultResolver,
  AggregateTransactionExecutionResultResolver,
  AggregateTransactionResolver,
  BlockRelationsResolver,
  BlockResultRelationsResolver,
  FindFirstBlockOrThrowResolver,
  FindFirstBlockResolver,
  FindFirstBlockResultOrThrowResolver,
  FindFirstBlockResultResolver,
  FindFirstTransactionExecutionResultOrThrowResolver,
  FindFirstTransactionExecutionResultResolver,
  FindFirstTransactionOrThrowResolver,
  FindFirstTransactionResolver,
  FindManyBlockResolver,
  FindManyBlockResultResolver,
  FindManyTransactionExecutionResultResolver,
  FindManyTransactionResolver,
  FindUniqueBlockResolver,
  FindUniqueBlockResultOrThrowResolver,
  FindUniqueBlockResultResolver,
  FindUniqueTransactionExecutionResultOrThrowResolver,
  FindUniqueTransactionExecutionResultResolver,
  FindUniqueTransactionOrThrowResolver,
  FindUniqueTransactionResolver,
  GroupByBlockResolver,
  GroupByBlockResultResolver,
  GroupByTransactionExecutionResultResolver,
  GroupByTransactionResolver,
  TransactionExecutionResultRelationsResolver,
  TransactionRelationsResolver,
} from "./generated/type-graphql";

function cleanResolvers(resolvers: NonEmptyArray<Function>) {
  return resolvers.map((resolver) => {
    const methods = Object.getOwnPropertyNames(resolver.prototype).map(
      (method) => method.toLowerCase()
    );
    methods.forEach((method) => {
      const shouldRemove =
        method.includes("update") ||
        method.includes("create") ||
        method.includes("delete") ||
        method.includes("upsert");

      if (shouldRemove) {
        delete resolver.prototype[method];
      }
    });
    return resolver;
  });
}

@graphqlModule()
export class GeneratedResolverFactoryGraphqlModule extends ResolverFactoryGraphqlModule {
  public constructor(
    @inject("GraphqlServer") public graphqlServer: GraphqlServer
  ) {
    super();

    this.graphqlServer.setContext({
      prisma: this.initializePrismaClient(),
    });
  }

  public initializePrismaClient() {
    // setup the prisma client and feed it to the server,
    // since this is necessary for the returned resolvers to work
    const prismaClient = new PrismaClient({
      // datasourceUrl: 'postgresql://admin:password@localhost:5433/protokit-indexer?schema=public'
    });
    prismaClient.$connect();

    return prismaClient;
  }

  public resolvers(): NonEmptyArray<Function> {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return cleanResolvers([
      // block resolvers
      AggregateBlockResolver,
      FindFirstBlockOrThrowResolver,
      FindFirstBlockResolver,
      FindManyBlockResolver,
      FindUniqueBlockResultOrThrowResolver,
      FindUniqueBlockResolver,
      GroupByBlockResolver,
      BlockRelationsResolver,
      // block result resolvers
      AggregateBlockResultResolver,
      FindFirstBlockResultOrThrowResolver,
      FindFirstBlockResultResolver,
      FindManyBlockResultResolver,
      FindUniqueBlockResultOrThrowResolver,
      FindUniqueBlockResultResolver,
      GroupByBlockResultResolver,
      BlockResultRelationsResolver,
      // transaction resolvers
      AggregateTransactionResolver,
      FindFirstTransactionOrThrowResolver,
      FindFirstTransactionResolver,
      FindManyTransactionResolver,
      FindUniqueTransactionOrThrowResolver,
      FindUniqueTransactionResolver,
      GroupByTransactionResolver,
      TransactionRelationsResolver,
      // transaction execution result resolvers
      AggregateTransactionExecutionResultResolver,
      FindFirstTransactionExecutionResultOrThrowResolver,
      FindFirstTransactionExecutionResultResolver,
      FindManyTransactionExecutionResultResolver,
      FindUniqueTransactionExecutionResultOrThrowResolver,
      FindUniqueTransactionExecutionResultResolver,
      GroupByTransactionExecutionResultResolver,
      TransactionExecutionResultRelationsResolver,
    ]) as NonEmptyArray<Function>;
  }
}
