import "reflect-metadata";
import {
  GraphqlSequencerModule,
  GraphqlServer,
  graphqlModule,
} from "@proto-kit/api";
import { log } from "@proto-kit/common";
import { jest } from "@jest/globals";

import { Indexer } from "../src/Indexer";
import { GeneratedResolverFactoryGraphqlModule } from "../src/api/GeneratedResolverFactoryGraphqlModule";

log.setLevel("info");

const port = 8081;
const findFirstSpy = jest.fn(() => {});
const findManySpy = jest.fn(() => []);

@graphqlModule()
class MockedGeneratedResolverFactoryGraphqlModule extends GeneratedResolverFactoryGraphqlModule {
  public initializePrismaClient() {
    return {
      block: {
        findFirst: findFirstSpy,
        findMany: findManySpy,
      },
    } as any;
  }
}

describe("GeneratedResolverFactoryGraphqlModule", () => {
  const indexer = Indexer.from({
    modules: {
      GraphqlServer: GraphqlServer,
      Graphql: GraphqlSequencerModule.from({
        modules: {
          GeneratedResolverFactory: MockedGeneratedResolverFactoryGraphqlModule,
        },
      }),
    },
  });

  indexer.configurePartial({
    GraphqlServer: {
      port,
      host: "0.0.0.0",
      graphiql: true,
    },
    Graphql: {
      GeneratedResolverFactory: {},
    },
  });

  beforeAll(async () => {
    await indexer.start();
  });

  it("should start a graphql server with the respective resolvers", async () => {
    // wait for the gql server to start
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 3000);
    });

    await fetch(`http://0.0.0.0:${port}/graphql`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        query: `{
          findFirstBlock(where:{height:{equals: 1}}) {
            hash,
            height
          }
        }`,
      }),
    });

    expect(findFirstSpy).toHaveBeenCalled();
  });

  it("should allow getting of 10 blocks", async () => {
    // wait for the gql server to start
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 3000);
    });

    let result: Response | undefined;
    try {
      result = await fetch(`http://0.0.0.0:${port}/graphql`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          query: `{
            blocks(take: 10) {
              hash,
              height
            }
          }`,
        }),
      });
    } finally {
      expect(result?.status).toBe(200);
    }
  });

  it("should not allow getting of more than 100 blocks", async () => {
    // wait for the gql server to start
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 3000);
    });

    let result: Response | undefined;
    try {
      result = await fetch(`http://0.0.0.0:${port}/graphql`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          query: `{
            blocks(take: 101) {
              hash,
              height
              
            }
          }`,
        }),
      });
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const response: {
        errors: unknown[];
      } = await result?.json();
      expect(result?.status).toBe(200);
      expect(response.errors.length).toBe(1);
    }
  });

  afterAll(() => {
    indexer.resolve("GraphqlServer").close();
  });
});
