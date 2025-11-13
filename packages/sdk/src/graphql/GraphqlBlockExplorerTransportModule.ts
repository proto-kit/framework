import { inject, injectable } from "tsyringe";
import { gql } from "@urql/core";
import {
  AppChainModule,
  BlockExplorerTransportModule,
  ClientBlock,
  InclusionStatus
} from "@proto-kit/sequencer";

import { GraphqlClient } from "./GraphqlClient";
import { Bool, Field } from "o1js";

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

  private parseClientBlock(data: any): ClientBlock | undefined {
    const blockData = data.block;

    if (!blockData) {
      return undefined;
    }

    return {
      hash: Field(blockData.hash),
      previousBlockHash: blockData.previousBlockHash
        ? Field(blockData.previousBlockHash)
        : undefined,
      height: Field(blockData.height),
      transactions: blockData.txs.map((tx: any) => ({
        tx: tx.tx, // This is simplified tx data from GraphQL
        status: Bool(tx.status),
        statusMessage: tx.statusMessage,
      })),
      transactionsHash: Field(blockData.transactionsHash),
    };
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

  async getBlock(param?: string | number): Promise<ClientBlock | undefined> {
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
      throw new Error(`Error fetching block!: ${queryResult.error}`);
    }

    return this.parseClientBlock(queryResult.data);
  }
}
