import { Field } from "o1js";

export interface SimpleAsyncStateService {
  get: (key: Field) => Promise<Field[] | undefined>;
  set: (key: Field, value: Field[] | undefined) => void;
}
