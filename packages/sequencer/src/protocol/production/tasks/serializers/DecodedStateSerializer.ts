import { Field } from "o1js";

import { TaskStateRecord } from "../../TransactionTraceService";
import { JSONEncodableState } from "../RuntimeProvingTask";

export class DecodedStateSerializer {
  public static fromJSON(json: JSONEncodableState): TaskStateRecord {
    return Object.fromEntries<Field[]>(
      Object.entries(json).map(([key, value]) => [
        key,
        value.map((encodedField) => Field(encodedField)),
      ])
    );
  }

  public static toJSON(input: TaskStateRecord): JSONEncodableState {
    return Object.fromEntries<string[]>(
      Object.entries(input).map(([key, value]) => [
        key,
        value.map((field) => field.toString()),
      ])
    );
  }
}
