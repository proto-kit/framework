import {
  GraphqlServer,
  ResolverFactoryGraphqlModule,
  graphqlModule,
} from "@proto-kit/api";
import { NonEmptyArray, createMethodMiddlewareDecorator } from "type-graphql";
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
  ResolversEnhanceMap,
  TransactionExecutionResultRelationsResolver,
  TransactionRelationsResolver,
  applyResolversEnhanceMap,
} from "./generated/type-graphql";

export function cleanResolvers(resolvers: NonEmptyArray<Function>) {
  return resolvers.map((resolver) => {
    const methods = Object.getOwnPropertyNames(resolver.prototype).map(
      (method) => method.toLowerCase()
    );
    methods.forEach((method) => {
      const shouldRemove =
        method.includes("update") ||
        method.includes("create") ||
        method.includes("delete") ||
        method.includes("upsert") ||
        method.includes("batch");

      if (shouldRemove) {
        delete resolver.prototype[method];
      }
    });
    return resolver;
  });
}

export function ValidateTakeArg() {
  return createMethodMiddlewareDecorator(async ({ args }, next) => {
    // Middleware code that uses custom decorator arguments
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const take: number | undefined = args?.take;
    if (take === undefined || take < 1 || take > 100) {
      throw new Error("You must specify 'take' between 1 and 100");
    }

    // eslint-disable-next-line @typescript-eslint/return-await
    return next();
  });
}

@graphqlModule()
export class GeneratedResolverFactoryGraphqlModule extends ResolverFactoryGraphqlModule {
  public constructor(
    @inject("GraphqlServer") public graphqlServer: GraphqlServer
  ) {
    super();
  }

  public async initializePrismaClient() {
    // setup the prisma client and feed it to the server,
    // since this is necessary for the returned resolvers to work
    const prismaClient = new PrismaClient({
      // datasourceUrl: 'postgresql://admin:password@localhost:5433/protokit-indexer?schema=public'
    });
    await prismaClient.$connect();

    return prismaClient;
  }

  public async resolvers(): Promise<NonEmptyArray<Function>> {
    this.graphqlServer.setContext({
      prisma: await this.initializePrismaClient(),
    });

    // basic way to limit the number of results returned at the argument level
    const resolversEnchanceMap: ResolversEnhanceMap = {
      Block: {
        aggregateBlock: [ValidateTakeArg()],
        blocks: [ValidateTakeArg()],
        groupByBlock: [ValidateTakeArg()],
      },
      BlockResult: {
        aggregateBlockResult: [ValidateTakeArg()],
        blockResults: [ValidateTakeArg()],
        groupByBlockResult: [ValidateTakeArg()],
      },
      Transaction: {
        aggregateTransaction: [ValidateTakeArg()],
        transactions: [ValidateTakeArg()],
        groupByTransaction: [ValidateTakeArg()],
      },
      TransactionExecutionResult: {
        aggregateTransactionExecutionResult: [ValidateTakeArg()],
        transactionExecutionResults: [ValidateTakeArg()],
        groupByTransactionExecutionResult: [ValidateTakeArg()],
      },
    };

    applyResolversEnhanceMap(resolversEnchanceMap);

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
