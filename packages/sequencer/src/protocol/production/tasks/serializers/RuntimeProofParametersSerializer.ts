import { TaskSerializer } from "../../../../worker/flow/Task";
import type { RuntimeProofParameters } from "../RuntimeProvingTask";
import { PendingTransaction } from "../../../../mempool/PendingTransaction";

export class RuntimeProofParametersSerializer
  implements TaskSerializer<RuntimeProofParameters>
{
  public toJSON(parameters: RuntimeProofParameters): string {
    return JSON.stringify({
      tx: parameters.tx.toJSON(),
      networkState: parameters.networkState,
      state: parameters.state,
    });
  }

  public fromJSON(json: string): RuntimeProofParameters {
    const parsed = JSON.parse(json);
    return {
      tx: PendingTransaction.fromJSON(parsed.tx),
      networkState: parsed.networkState,
      state: parsed.state,
    };
  }
}
