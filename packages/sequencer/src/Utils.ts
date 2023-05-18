import { Field } from "snarkyjs";

// eslint-disable-next-line import/no-unused-modules
export function structArrayToFields(
  ...args: { toFields: () => Field[] }[]
): Field[] {
  return args.flatMap((x) => x.toFields());
}
