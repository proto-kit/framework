import { inject, injectable } from "tsyringe";
import {
  NetworkStateTransportModule,
  AppChainModule,
} from "@proto-kit/sequencer";
import { NetworkStateJson } from "@proto-kit/protocol";
import { gql } from "@urql/core";

import { GraphqlClient } from "./GraphqlClient";

const errors = {
  receivedNoDataOrError: () => new Error("Received no data and no error"),

  receivedResultMalformed: (message: string) =>
    new Error(`Received result malformed: ${message}`),

  uncatchableError: () => new Error("Uncatchable error"),
};

@injectable()
export class GraphqlNetworkStateTransportModule
  extends AppChainModule<Record<string, never>>
  implements NetworkStateTransportModule
{
  public constructor(
    @inject("GraphqlClient") private readonly graphqlClient: GraphqlClient
  ) {
    super();
  }

  private async retrieveNetworkState(path: string): Promise<NetworkStateJson> {
    const query = gql`
      query NetworkState {
        network {
          ${path} {
            block {
              height
            }
            previous {
              rootHash
            }
          }
        }
      }
    `;

    const queryResult = await this.graphqlClient.client
      .query(query, {})
      .toPromise();

    if (queryResult.error === undefined) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const json = queryResult.data?.network?.unproven;

      if (json === undefined || json === null) {
        throw errors.receivedNoDataOrError();
      }

      try {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        return json as NetworkStateJson;
      } catch (e) {
        if (e instanceof Error) {
          throw errors.receivedResultMalformed(e.message);
        }
        throw errors.uncatchableError();
      }
    }
    throw new Error(queryResult.error.message);
  }

  public async getProvenNetworkState(): Promise<NetworkStateJson> {
    return await this.retrieveNetworkState("proven");
  }

  public async getStagedNetworkState(): Promise<NetworkStateJson> {
    return await this.retrieveNetworkState("staged");
  }

  public async getUnprovenNetworkState(): Promise<NetworkStateJson> {
    return await this.retrieveNetworkState("unproven");
  }
}
