import { noop } from "@proto-kit/common";

import { ProvableTransactionHook } from "../protocol/ProvableTransactionHook";

export class NoopTransactionHook extends ProvableTransactionHook {
  public async onTransaction() {
    noop();
  }

  public async onAfterTransaction() {
    noop();
  }
}
