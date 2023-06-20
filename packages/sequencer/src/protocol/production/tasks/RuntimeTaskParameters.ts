import { Field } from "snarkyjs";
import { ReturnType } from "@yab/protocol";

import { PendingTransaction } from "../../../mempool/PendingTransaction";
import { TaskSerializer } from "../../../worker/manager/ReducableTask";

export interface DecodedState {
  [key: string]: Field[] | undefined;
}

export interface RuntimeProofParameters {
  // publicInput: MethodPublicInput;
  tx: PendingTransaction;
  state: DecodedState;
}

interface JSONEncodableState {
  [key: string]: string[] | undefined;
}

export class RuntimeProofParametersSerializer
  implements TaskSerializer<RuntimeProofParameters>
{
  public toJSON(parameters: RuntimeProofParameters): string {
    const jsonReadyObject = {
      tx: parameters.tx.toJSON(),

      state: Object.entries(parameters.state).reduce<JSONEncodableState>(
        (aggregator, entry) => {
          aggregator[entry[0]] = entry[1]?.map((field) => field.toString());
          return aggregator;
        },
        {}
      ),
    };
    return JSON.stringify(jsonReadyObject);
  }

  public fromJSON(json: string): RuntimeProofParameters {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const jsonReadyObject: {
      tx: ReturnType<PendingTransaction["toJSON"]>;
      state: JSONEncodableState;
    } = JSON.parse(json);
    return {
      tx: PendingTransaction.fromJSON(jsonReadyObject.tx),

      state: Object.entries(jsonReadyObject.state).reduce<DecodedState>(
        (aggregator, entry) => {
          aggregator[entry[0]] = entry[1]?.map((encodedField) =>
            Field(encodedField)
          );
          return aggregator;
        },
        {}
      ),
    };
  }
}
