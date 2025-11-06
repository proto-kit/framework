import { inject, injectable } from "tsyringe";
import { gql } from "@urql/core";

import { sleep } from "@proto-kit/common";
import { AppChainModule, BlockExplorer } from "@proto-kit/sequencer";
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
export class GraphqlBlockExplorer
  extends AppChainModule
  implements BlockExplorer {
  public constructor(
    @inject("GraphqlClient") private readonly graphqlClient: GraphqlClient
  ) {
    super();
  }

  public async waitTxInclusion(
    txHash: string,
    interval = 1000,
    attempts = 5
  ): Promise<{ transactionState: InclusionStatus }> {
    const query = gql`
      query transactionState($hash: String!) {
        transactionState(hash: $hash)
      }
    `;

    let remainingAttempts = attempts;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      // eslint-disable-next-line no-await-in-loop
      const queryResult = await this.graphqlClient.client
        .query(query, { hash: txHash })
        .toPromise();

      if (queryResult.error) {
        throw new Error("Error in query!");
      }

      const status = queryResult.data?.transactionState as
        | string
        | undefined;

      if (status === "INCLUDED") {
        return { transactionState: InclusionStatus.INCLUDED };
      }

      if (status === "PENDING") {
        return { transactionState: InclusionStatus.PENDING };
      }

      if (remainingAttempts <= 0) {
        return { transactionState: InclusionStatus.UNKNOWN };
      }

      remainingAttempts -= 1;
      // eslint-disable-next-line no-await-in-loop
      await sleep(interval);
    }
  }

  public async getBlock(
    blockHash: string,
    blockHeight: number
  ): Promise<unknown> {
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
      .query(query, { hash: blockHash, height: blockHeight })
      .toPromise();

    if (queryResult.error) {
      throw new Error("Error fetching block!");
    }

    return queryResult.data as unknown;
  }
}