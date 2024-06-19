import { Arg, Mutation, Query, registerEnumType } from "type-graphql";
import { inject } from "tsyringe";
import {
  Mempool,
  PendingTransaction,
  TransactionStorage,
} from "@proto-kit/sequencer";

import { graphqlModule, GraphqlModule } from "../GraphqlModule.js";

import { TransactionModel } from "./model/TransactionModel.js";

enum InclusionStatus {
  UNKNOWN = "unknown",
  PENDING = "pending",
  INCLUDED = "included",
  SETTLED = "settled",
}

registerEnumType(InclusionStatus, {
  name: "InclusionStatus",
});

@graphqlModule()
export class MempoolResolver extends GraphqlModule {
  public constructor(
    @inject("Mempool") private readonly mempool: Mempool,
    @inject("TransactionStorage")
    private readonly transactionStorage: TransactionStorage
  ) {
    super();
  }

  @Mutation(() => String, {
    description: "Adds a transaction to the mempool and validates it",
  })
  public async submitTx(@Arg("tx") tx: TransactionModel): Promise<string> {
    const decoded = PendingTransaction.fromJSON(tx);
    await this.mempool.add(decoded);

    return decoded.hash().toString();
  }

  @Query(() => InclusionStatus, {
    description: "Returns the state of a given transaction",
  })
  public async transactionState(
    @Arg("hash", {
      description: "The hash of the transaction to be queried for",
    })
    hash: string
  ): Promise<InclusionStatus> {
    const txs = await this.mempool.getTxs();
    const tx = txs.find((x) => x.hash().toString() === hash);

    if (tx) {
      return InclusionStatus.PENDING;
    }

    const dbTx = await this.transactionStorage.findTransaction(hash);

    if (dbTx !== undefined) {
      if (dbTx.batch !== undefined) {
        return InclusionStatus.SETTLED;
      }
      if (dbTx.block !== undefined) {
        return InclusionStatus.INCLUDED;
      }
    }

    return InclusionStatus.UNKNOWN;
  }

  @Query(() => [String], {
    description:
      "Returns the hashes of all transactions that are currently inside the mempool",
  })
  public async transactions() {
    const txs = await this.mempool.getTxs();
    return txs.map((x) => x.hash().toString());
  }
}
