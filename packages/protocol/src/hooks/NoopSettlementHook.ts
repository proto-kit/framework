import { injectable } from "tsyringe";
import { noop } from "@proto-kit/common";
import { SmartContract } from "o1js";

import {
  ProvableSettlementHook,
  SettlementHookInputs,
} from "../settlement/modularity/ProvableSettlementHook";

@injectable()
export class NoopSettlementHook extends ProvableSettlementHook<
  Record<string, never>
> {
  public async beforeSettlement(
    contract: SmartContract,
    state: SettlementHookInputs
  ) {
    noop();
  }
}
