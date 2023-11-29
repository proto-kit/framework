import { inject, injectable } from "tsyringe";
import { AppChainModule } from "../appChain/AppChainModule";
import { GraphqlClient } from "./GraphqlClient";
import { NetworkStateTransportModule } from "@proto-kit/sequencer";
import { NetworkState } from "@proto-kit/protocol";
import { gql } from "@urql/core";
import { Field } from "o1js";

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

  private async retrieveNetworkState(path: string): Promise<NetworkState> {
    const query = gql`
      query NetworkState {
          network {
              ${path} {
                  block {
                      height
                  }
              }
          }
      }
    `;

    const queryResult = await this.graphqlClient.client
      .query(query, {})
      .toPromise();

    if (queryResult.error === undefined) {
      const json = queryResult.data?.network;

      if (json === undefined || json === null) {
        throw new Error("Received no data and no error")
      }

      try {
        return new NetworkState(NetworkState.fromJSON(json))
      } catch(e) {
        if(e instanceof Error){
          throw new Error(`Received result malformed: ${e.message}`)
        }
        throw new Error("Uncatchable error")
      }
    }
    throw new Error(queryResult.error.message);
  }

  public async getProvenNetworkState(): Promise<NetworkState> {
    return await this.retrieveNetworkState("proven")
  }

  public async getStagedNetworkState(): Promise<NetworkState> {
    return await this.retrieveNetworkState("staged")
  }

  public async getUnprovenNetworkState(): Promise<NetworkState> {
    return await this.retrieveNetworkState("unproven")
  }
}
