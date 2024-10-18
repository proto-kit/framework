import {
  GraphqlServer,
  ResolverFactoryGraphqlModule as BaseResolverFactoryGraphqlModule,
  graphqlModule,
} from "@proto-kit/api";
import { NonEmptyArray, createMethodMiddlewareDecorator } from "type-graphql";
import { ChildContainerProvider, TypedClass } from "@proto-kit/common";

import { PrismaDatabaseConnection } from "../storage/PrismaDatabaseConnection";
import { BasePrismaClient } from "../handlers/BasePrismaClient";

export function cleanResolvers(resolvers: NonEmptyArray<Function>) {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
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
  }) as unknown as NonEmptyArray<Function>;
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
export class ResolverFactoryGraphqlModule<
  PrismaClient extends BasePrismaClient,
> extends BaseResolverFactoryGraphqlModule {
  public static from<PrismaClient extends BasePrismaClient>(
    resolvers: NonEmptyArray<Function>
  ): TypedClass<ResolverFactoryGraphqlModule<PrismaClient>> {
    return class ScopedResolverFactoryGraphqlModule extends ResolverFactoryGraphqlModule<PrismaClient> {
      public async resolvers() {
        return cleanResolvers(resolvers);
      }
    };
  }

  public database: PrismaDatabaseConnection<PrismaClient> | undefined;

  public constructor(public graphqlServer: GraphqlServer) {
    super();
  }

  public create(childContainerProvider: ChildContainerProvider): void {
    const container = childContainerProvider();
    this.graphqlServer = container.resolve("GraphqlServer");
    this.database = container.resolve("Database");
    this.graphqlServer.setContext({
      prisma: this.database?.prismaClient,
    });
  }

  public async resolvers(): Promise<NonEmptyArray<Function>> {
    // this is overwritten when .from is used
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return [] as unknown as NonEmptyArray<Function>;
  }
}
