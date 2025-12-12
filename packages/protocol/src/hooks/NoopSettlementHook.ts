import { injectable } from "tsyringe";
import { noop } from "@proto-kit/common";

import {
  ProvableSettlementHook,
  SettlementHookInputs,
} from "../settlement/modularity/ProvableSettlementHook";
import { SettlementContractType } from "../settlement/contracts/settlement/SettlementBase";

@injectable()
export class NoopSettlementHook extends ProvableSettlementHook<
  Record<string, never>
> {
  public async beforeSettlement(
    contract: SettlementContractType,
    state: SettlementHookInputs
  ) {
    noop();
  }
}
