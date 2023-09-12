import { Field } from "snarkyjs";

export interface StateService {
  get: (key: Field) => Field[] | undefined;
  set: (key: Field, value: Field[] | undefined) => void;
}