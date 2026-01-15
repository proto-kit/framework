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
  AggregateBatchResolver,
  AggregateBlockResolver,
  AggregateBlockResultResolver,
  AggregateSettlementResolver,
  AggregateTransactionExecutionResultResolver,
  AggregateTransactionResolver,
  BatchRelationsResolver,
  BlockRelationsResolver,
  BlockResultRelationsResolver,
  FindFirstBatchOrThrowResolver,
  FindFirstBatchResolver,
  FindFirstBlockOrThrowResolver,
  FindFirstBlockResolver,
  FindFirstBlockResultOrThrowResolver,
  FindFirstBlockResultResolver,
  FindFirstSettlementOrThrowResolver,
  FindFirstSettlementResolver,
  FindFirstTransactionExecutionResultOrThrowResolver,
  FindFirstTransactionExecutionResultResolver,
  FindFirstTransactionOrThrowResolver,
  FindFirstTransactionResolver,
  FindManyBatchResolver,
  FindManyBlockResolver,
  FindManyBlockResultResolver,
  FindManySettlementResolver,
  FindManyTransactionExecutionResultResolver,
  FindManyTransactionResolver,
  FindUniqueBatchOrThrowResolver,
  FindUniqueBatchResolver,
  FindUniqueBlockResolver,
  FindUniqueBlockResultOrThrowResolver,
  FindUniqueBlockResultResolver,
  FindUniqueSettlementOrThrowResolver,
  FindUniqueSettlementResolver,
  FindUniqueTransactionExecutionResultOrThrowResolver,
  FindUniqueTransactionExecutionResultResolver,
  FindUniqueTransactionOrThrowResolver,
  FindUniqueTransactionResolver,
  GroupByBatchResolver,
  GroupByBlockResolver,
  GroupByBlockResultResolver,
  GroupBySettlementResolver,
  GroupByTransactionExecutionResultResolver,
  GroupByTransactionResolver,
  ResolversEnhanceMap,
  SettlementRelationsResolver,
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
        method.includes("upsert");

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
        blocks: [ValidateTakeArg()],
        groupByBlock: [ValidateTakeArg()],
      },
      BlockResult: {
        blockResults: [ValidateTakeArg()],
        groupByBlockResult: [ValidateTakeArg()],
      },
      Transaction: {
        transactions: [ValidateTakeArg()],
        groupByTransaction: [ValidateTakeArg()],
      },
      TransactionExecutionResult: {
        transactionExecutionResults: [ValidateTakeArg()],
        groupByTransactionExecutionResult: [ValidateTakeArg()],
      },
      Batch: {
        batches: [ValidateTakeArg()],
        groupByBatch: [ValidateTakeArg()],
      },
      Settlement: {
        settlements: [ValidateTakeArg()],
        groupBySettlement: [ValidateTakeArg()],
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
      // batches resolvers
      AggregateBatchResolver,
      FindFirstBatchOrThrowResolver,
      FindFirstBatchResolver,
      FindManyBatchResolver,
      FindUniqueBatchOrThrowResolver,
      FindUniqueBatchResolver,
      GroupByBatchResolver,
      BatchRelationsResolver,
      // settlements resolvers
      AggregateSettlementResolver,
      FindFirstSettlementOrThrowResolver,
      FindFirstSettlementResolver,
      FindManySettlementResolver,
      FindUniqueSettlementOrThrowResolver,
      FindUniqueSettlementResolver,
      GroupBySettlementResolver,
      SettlementRelationsResolver,
    ]) as NonEmptyArray<Function>;
  }
}
