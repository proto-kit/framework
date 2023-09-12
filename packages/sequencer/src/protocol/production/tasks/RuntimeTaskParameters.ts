import { Field } from "snarkyjs";
import { NetworkState, ReturnType } from "@proto-kit/protocol";

import { PendingTransaction } from "../../../mempool/PendingTransaction";
import { TaskSerializer } from "../../../worker/manager/ReducableTask";

export interface DecodedState {
  [key: string]: Field[] | undefined;
}

export interface RuntimeProofParameters {
  // publicInput: MethodPublicInput;
  tx: PendingTransaction;
  networkState: NetworkState;
  state: DecodedState;
}

export interface JSONEncodableState {
  [key: string]: string[] | undefined;
}

export class RuntimeProofParametersSerializer
  implements TaskSerializer<RuntimeProofParameters>
{
  public toJSON(parameters: RuntimeProofParameters): string {
    const jsonReadyObject = {
      tx: parameters.tx.toJSON(),
      networkState: NetworkState.toJSON(parameters.networkState),

      state: Object.fromEntries(
        Object.entries(parameters.state).map(([key, value]) => [
          key,
          value?.map((v) => v.toString()),
        ])
      ),
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

      state: Object.fromEntries(
        Object.entries(jsonReadyObject.state).map(([key, values]) => [
          key,
          values?.map((encodedField) => Field(encodedField)),
        ])
      ),
    };
  }
}
