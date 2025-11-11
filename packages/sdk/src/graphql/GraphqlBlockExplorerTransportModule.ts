import { inject, injectable } from "tsyringe";
import { gql } from "@urql/core";
import {
  AppChainModule,
  BlockExplorerTransportModule,
} from "@proto-kit/sequencer";
import { InclusionStatus } from "@proto-kit/api";

import { GraphqlClient } from "./GraphqlClient";

const BATCH_TRANSACTION_MODEL_FRAGMENT = gql`
  fragment BatchTransactionModelFragment on BatchTransactionModel {
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
`;

@injectable()
export class GraphqlBlockExplorerTransportModule
  extends AppChainModule
  implements BlockExplorerTransportModule {
  public constructor(
    @inject("GraphqlClient") private readonly graphqlClient: GraphqlClient
  ) {
    super();
  }

  public async fetchTxStatus(txHash: string): Promise<InclusionStatus> {
    const query = gql`
      query transactionState($hash: String!) {
        transactionState(hash: $hash)
      }
    `;

    const queryResult = await this.graphqlClient.client
      .query(query, { hash: txHash })
      .toPromise();

    if (queryResult.error) {
      throw new Error("Error in query!");
    }

    return queryResult.data?.transactionState as InclusionStatus;
  }

  async getBlock(param?: string | number): Promise<any> {
    let hash: string | undefined;
    let height: number | undefined;

    if (typeof param === "string") {
      hash = param;
    } else if (typeof param === "number") {
      height = param;
    }

    const query = gql`
      ${BATCH_TRANSACTION_MODEL_FRAGMENT}
      query block($hash: String, $height: Float) {
        block(hash: $hash, height: $height) {
          hash
          previousBlockHash
          height
          txs {
            ...BatchTransactionModelFragment
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