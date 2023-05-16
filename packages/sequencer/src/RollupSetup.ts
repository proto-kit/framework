import { container, injectable } from "tsyringe";

import type { GraphqlModule } from "./graphql/GraphqlModule.js";
import { GraphqlServer } from "./graphql/GraphqlServer.js";
import type { Mempool } from "./mempool/Mempool.js";

@injectable()
export class RollupSetup {
  public registerMempoolModule(mempool: Mempool) {
    container.registerInstance("mempool", mempool);
  }

  public registerGraphqlModule(module: GraphqlModule) {
    container.registerInstance<GraphqlModule>("GraphqlModule", module);
  }

  public async start() {
    const graphql = container.resolve(GraphqlServer);
    await graphql.start();
  }
}
