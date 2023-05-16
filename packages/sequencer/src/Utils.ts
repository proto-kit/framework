import { Field, type Proof } from "snarkyjs";
import { TypedClassType } from "@yab/protocol";

// eslint-disable-next-line import/no-unused-modules
export function structArrayToFields(...args: { toFields: () => Field[] }[]): Field[] {
  return args.flatMap((x) => x.toFields());
}
