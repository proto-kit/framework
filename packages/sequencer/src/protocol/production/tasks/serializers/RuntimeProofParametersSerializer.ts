import { NetworkState, ReturnType } from "@proto-kit/protocol";

import { TaskSerializer } from "../../../../worker/flow/Task";
import { PendingTransaction } from "../../../../mempool/PendingTransaction";
import type { RuntimeProofParameters } from "../RuntimeProvingTask";

import {
  DecodedStateSerializer,
  JSONEncodableState,
} from "./DecodedStateSerializer";

export class RuntimeProofParametersSerializer implements TaskSerializer<RuntimeProofParameters> {
  public toJSON(parameters: RuntimeProofParameters): string {
    const jsonReadyObject = {
      tx: parameters.tx.toJSON(),
      networkState: NetworkState.toJSON(parameters.networkState),
      state: DecodedStateSerializer.toJSON(parameters.state),
    };
    return JSON.stringify(jsonReadyObject);
  }

  public fromJSON(json: string): RuntimeProofParameters {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const jsonReadyObject: {
      tx: ReturnType<PendingTransaction["toJSON"]>;
      networkState: ReturnType<(typeof NetworkState)["toJSON"]>;
      state: JSONEncodableState;
    } = JSON.parse(json);
    return {
      tx: PendingTransaction.fromJSON(jsonReadyObject.tx),

      networkState: new NetworkState(
        NetworkState.fromJSON(jsonReadyObject.networkState)
      ),

      state: DecodedStateSerializer.fromJSON(jsonReadyObject.state),
    };
  }
}
