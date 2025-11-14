import { inject, injectable } from "tsyringe";
import { gql } from "@urql/core";
import {
  AppChainModule,
  BlockExplorerTransportModule,
  ClientBlock,
  ClientTransaction,
  InclusionStatus,
} from "@proto-kit/sequencer";
import { Field } from "o1js";

import { GraphqlClient } from "./GraphqlClient";

interface BlockQueryResponse {
  block: {
    hash: string;
    previousBlockHash: string;
    height: number;
    transactionsHash: string;
    txs: ClientTransaction[];
  };
}

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

  public async fetchTxInclusion(txHash: string): Promise<InclusionStatus> {
    const query = gql`
      query transactionState($hash: String!) {
        transactionState(hash: $hash)
      }
    `;

    const queryResult = await this.graphqlClient.client
      .query(query, { hash: txHash })
      .toPromise();

    if (queryResult.error) {
      throw new Error(`Error in fetchTxInclusion query: ${queryResult.error}`);
    }

    return queryResult.data?.transactionState;
  }

  async getBlock(
    param: { hash: string } | { height: number }
  ): Promise<ClientBlock | undefined> {
    let hash: string | undefined;
    let height: number | undefined;

    if ("hash" in param) {
      hash = param.hash;
    } else {
      height = param.height;
    }

    const query = gql`
      query block($hash: String, $height: Float) {
        block(hash: $hash, height: $height) {
          hash
          previousBlockHash
          height
          txs {
            tx {
              hash
              methodId
              nonce
              sender
              argsFields
              auxiliaryData
              signature {
                r
                s
              }
              isMessage
            }
            status
            statusMessage
          }
          transactionsHash
        }
      }
    `;

    const queryResult = await this.graphqlClient.client
      .query<BlockQueryResponse>(query, { hash, height })
      .toPromise();

    if (queryResult.error) {
      throw new Error(`Error fetching block: ${queryResult.error}`);
    }

    if (queryResult.data == null || queryResult.data.block == null) {
      return undefined;
    }

    const blockData = queryResult.data.block;

    const previousBlockHash =
      blockData.previousBlockHash != null && blockData.previousBlockHash !== ""
        ? Field(blockData.previousBlockHash)
        : undefined;

    return {
      hash: Field(blockData.hash),
      height: Field(blockData.height),
      previousBlockHash,
      transactionsHash: Field(blockData.transactionsHash),
      transactions: blockData.txs,
    };
  }
}
