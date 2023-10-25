import { Field } from "o1js";

export interface QueryTransportModule {
  get: (key: Field) => Promise<Field[] | undefined>;
}
