import { inject, injectable } from "tsyringe";
import { gql } from "@urql/core";
import {
  AppChainModule,
  Block,
  BlockExplorerTransportModule,
  InclusionStatus
} from "@proto-kit/sequencer";

import { GraphqlClient } from "./GraphqlClient";

@injectable()
export class GraphqlBlockExplorerTransportModule
  extends AppChainModule
  implements BlockExplorerTransportModule
{
  public constructor(
    @inject("GraphqlClient") private readonly graphqlClient: GraphqlClient
  ) {
    super();
  }

  public async waitTxInclusion(txHash: string): Promise<InclusionStatus> {
    const query = gql`
      query transactionState($hash: String!) {
        transactionState(hash: $hash)
      }
    `;

    const queryResult = await this.graphqlClient.client
      .query(query, { hash: txHash })
      .toPromise();

    if (queryResult.error) {
      throw new Error(`Error in waitTxInclusion query: ${queryResult.error}`);
    }

    return queryResult.data?.transactionState;
  }

  async getBlock(param?: string | number): Promise<Block> {
    let hash: string | undefined;
    let height: number | undefined;

    if (typeof param === "string") {
      hash = param;
    } else if (typeof param === "number") {
      height = param;
    }

    const query = gql`
      query block($hash: String, $height: Float) {
        block(hash: $hash, height: $height) {
          hash
          previousBlockHash
          height
          txs {
            tx {
              methodId
              nonce
              sender
              argsFields
              auxiliaryData
            }
            status
            statusMessage
          }
          transactionsHash
        }
      }
    `;

    const queryResult = await this.graphqlClient.client
      .query(query, { hash, height })
      .toPromise();

    if (queryResult.error) {
      throw new Error("Error fetching block!");
    }

    return queryResult.data;
  }
}
