import { AppChainModule } from "../appChain/AppChainModule";
import { inject, injectable } from "tsyringe";
import { GraphqlClient } from "./GraphqlClient";
import { TransactionSender } from "../transaction/InMemoryTransactionSender";
import { PendingTransaction } from "@proto-kit/sequencer";
import { gql } from "@urql/core";

@injectable()
export class GraphqlTransactionSender
  extends AppChainModule<Record<string, never>>
  implements TransactionSender
{
  public constructor(
    @inject("GraphqlClient") private readonly graphqlClient: GraphqlClient
  ) {
    super();
  }

  public async send(transaction: PendingTransaction): Promise<void> {
    const query = gql`
      mutation SubmitTx($tx: TransactionObjectInput!) {
        submitTx(tx: $tx)
      }
    `;
    const txJson = transaction.toJSON();

    const queryResult = await this.graphqlClient.client
      .mutation(query, { tx: txJson })
      .toPromise();

    if (queryResult.error === undefined) {
      const hash = queryResult.data?.submitTx;

      if (hash === undefined) {
        throw new Error("Mutation returned invalid result: submitTx");
      }
    } else {
      throw new Error(queryResult.error.message);
    }
  }
}
