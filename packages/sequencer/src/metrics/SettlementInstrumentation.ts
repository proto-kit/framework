import { inject, injectable } from "tsyringe";

import type { SettlementModule } from "../settlement/SettlementModule";

import { instrumentation, PushInstrumentation } from "./Instrumentation";

@instrumentation()
@injectable()
export class SettlementInstrumentation extends PushInstrumentation {
  names = ["settlement_height"];

  description = "Settlement height";

  public constructor(
    @inject("SettlementModule")
    private readonly settlementModule: SettlementModule
  ) {
    super();
  }

  public async start() {
    this.settlementModule.events.on("settlement-submitted", (settlement) => {
      this.pushValue(
        "settlement_height",
        parseInt(settlement.batches.at(-1)!.toString(), 10)
      );
    });
  }
}
