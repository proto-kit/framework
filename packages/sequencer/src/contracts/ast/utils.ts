import { ToFieldable, FieldVar } from "./types";
import { Field } from "o1js";

export function getFieldVars(obj: ToFieldable): FieldVar[] {
  const objConstructor = obj.constructor as unknown as { toFields: (a: ToFieldable) => Field[] }
  return objConstructor.toFields(obj).map((f) => f.value);
}

export function assertIsFieldable<T extends any>(
  obj: T,
  msg = "Only provable types are supported in functions like this"
): asserts obj is T & ToFieldable {
  if(typeof (obj as any).constructor["toFields"] !== "function") {
    throw new Error(msg);
  }
}
