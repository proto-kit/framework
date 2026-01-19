import { PendingTransaction, UnsignedTransaction } from "@proto-kit/sequencer";

import { Signer } from "./InMemorySigner";
import { TransactionSender } from "./InMemoryTransactionSender";

export class AppChainTransaction {
  public transaction?: PendingTransaction | UnsignedTransaction;

  public constructor(
    public signer: Signer,
    public transactionSender: TransactionSender
  ) {}

  public withUnsignedTransaction(unsignedTransaction: UnsignedTransaction) {
    this.transaction = unsignedTransaction;
  }

  public hasUnsignedTransaction(
    transaction?: PendingTransaction | UnsignedTransaction
  ): asserts transaction is UnsignedTransaction {
    const isUnsignedTransaction = transaction instanceof UnsignedTransaction;
    if (!isUnsignedTransaction) {
      throw new Error("Not an unsigned transaction");
    }
  }

  public hasPendingTransaction(
    transaction?: PendingTransaction | UnsignedTransaction
  ): asserts transaction is PendingTransaction {
    const isUnsignedTransaction = transaction instanceof PendingTransaction;
    if (!isUnsignedTransaction) {
      throw new Error("Not a pending transaction");
    }
  }

  public async sign() {
    this.hasUnsignedTransaction(this.transaction);
    const signatureData = this.transaction.getSignatureData();
    const signature = await this.signer.sign(signatureData);

    if (!signature.verify(this.transaction.sender, signatureData).toBoolean()) {
      throw new Error("Signer didn't provide correct signature for tx");
    }

    this.transaction = this.transaction.signed(signature);
  }

  public async send() {
    this.hasPendingTransaction(this.transaction);
    await this.transactionSender.send(this.transaction);
  }
}
