import { inject, injectable } from "tsyringe";
import { gql } from "@urql/core";
import { GraphqlClient } from "../graphql/GraphqlClient";
import { sleep } from "@proto-kit/common";
import { AppChainModule, BlockExplorer } from "@proto-kit/sequencer";


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

    while(true){            
        const queryResult = await this.graphqlClient.client
        .query(query, { hash: txHash })
        .toPromise();

        if (queryResult.error) {
        throw new Error("Error in query!");
        }

        if(queryResult.data?.transactionState === "INCLUDED"){
            return queryResult.data;
        }

        if (attempts > 0 && attempts-- <= 0) {
          throw new Error("Transaction not included");
        }
        
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
    `;

    const queryResult = await this.graphqlClient.client
      .query(query, { hash: blockHash, height: blockHeight })
      .toPromise();

    if (queryResult.error) {
      throw new Error("Error fetching block!");
    }

    return queryResult.data;
  }
}