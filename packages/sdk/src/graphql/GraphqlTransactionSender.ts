import { inject, injectable } from "tsyringe";
import {
  AppChainModule,
  PendingTransactionJSONType,
} from "@proto-kit/sequencer";
import { gql } from "@urql/core";

import { TransactionSender } from "../transaction/InMemoryTransactionSender";

import { GraphqlClient } from "./GraphqlClient";

@injectable()
export class GraphqlTransactionSender
  extends AppChainModule
  implements TransactionSender
{
  public constructor(
    @inject("GraphqlClient") private readonly graphqlClient: GraphqlClient
  ) {
    super();
  }

  public async send(transaction: PendingTransactionJSONType): Promise<void> {
    const query = gql`
      mutation SubmitTx($tx: TransactionObjectInput!) {
        submitTx(tx: $tx)
      }
    `;
    const tx = transaction;

    const queryResult = await this.graphqlClient.client
      .mutation(query, { tx })
      .toPromise();

    if (queryResult.error === undefined) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const hash = queryResult.data?.submitTx;

      if (hash === undefined) {
        throw new Error("Mutation returned invalid result: submitTx");
      }
    } else {
      throw new Error(queryResult.error.message);
    }
  }
}
