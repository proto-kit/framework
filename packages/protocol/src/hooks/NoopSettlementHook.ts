import { injectable } from "tsyringe";
import { noop } from "@proto-kit/common";

import {
  ProvableSettlementHook,
  SettlementHookInputs,
} from "../settlement/modularity/ProvableSettlementHook";
import { SettlementSmartContractBase } from "../settlement/contracts/SettlementSmartContract";

@injectable()
export class NoopSettlementHook extends ProvableSettlementHook<
  Record<string, never>
> {
  public async beforeSettlement(
    contract: SettlementSmartContractBase,
    state: SettlementHookInputs
  ) {
    noop();
  }
}
