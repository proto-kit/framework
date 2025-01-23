import { noop } from "@proto-kit/common";

import { ProvableTransactionHook } from "../protocol/ProvableTransactionHook";

export class NoopTransactionHook extends ProvableTransactionHook {
  public async beforeTransaction() {
    noop();
  }

  public async afterTransaction() {
    noop();
  }
}
