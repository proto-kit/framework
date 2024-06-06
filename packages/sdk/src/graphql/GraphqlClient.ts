import { Client, fetchExchange } from "@urql/core";

import { AppChainModule } from "../appChain/AppChainModule";

export interface GraphqlClientConfig {
  url: string;
}

export class GraphqlClient extends AppChainModule<GraphqlClientConfig> {
  private initializedClient?: Client;

  private createClient(): Client {
    const { url } = this.config;
    return new Client({
      url,
      exchanges: [fetchExchange],
    });
  }

  public get client(): Client {
    if (this.initializedClient === undefined) {
      this.initializedClient = this.createClient();
    }
    return this.initializedClient;
  }
}
