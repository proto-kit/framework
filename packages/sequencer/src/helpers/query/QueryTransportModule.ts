import { Field } from "snarkyjs";

export interface QueryTransportModule {
  get: (key: Field) => Promise<Field[] | undefined>;
}
