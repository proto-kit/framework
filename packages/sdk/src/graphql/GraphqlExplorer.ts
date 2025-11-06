import { inject, injectable } from "tsyringe";
import { gql } from "@urql/core";
import { GraphqlClient } from "../graphql/GraphqlClient";
import { sleep } from "@proto-kit/common";
import { AppChainModule, BlockExplorer } from "@proto-kit/sequencer";
import { InclusionStatus } from "@proto-kit/api";

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
  ) {
    const query = gql`
      query transactionState($hash: String!) {
        transactionState(hash: $hash)
      }
    `;

    while (true) {
      const queryResult = await this.graphqlClient.client
        .query(query, { hash: txHash })
        .toPromise();

      if (queryResult.error) {
        throw new Error("Error in query!");
      }

      const status = queryResult.data?.transactionState;

      if (status === "INCLUDED") {
        return { transactionState: InclusionStatus.INCLUDED };
      }

      if (status === "PENDING") {
        return { transactionState: InclusionStatus.PENDING };
      }

      if (attempts <= 0) {
        return { transactionState: InclusionStatus.UNKNOWN };
      }

      attempts--;
      await sleep(interval);
    }
  }

  public async getBlock(blockHash: string, blockHeight: number) {
    const query = gql`
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
      ${BATCH_TRANSACTION_MODEL_FRAGMENT}
    `;

    const queryResult = await this.graphqlClient.client
      .query(query, { hash: blockHash, height: blockHeight })
      .toPromise();

    if (queryResult.error) {
      throw new Error("Error fetching block!");
    }

    return queryResult;
  }
}