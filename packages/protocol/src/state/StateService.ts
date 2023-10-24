import { Field } from "o1js";

export interface StateService {
  get: (key: Field) => Field[] | undefined;
  set: (key: Field, value: Field[] | undefined) => void;
}
