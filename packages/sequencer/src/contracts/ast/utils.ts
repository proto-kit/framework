import { ToFieldable, FieldVar } from "./types";
import { Field, ProvablePure } from "o1js";

export function getFieldVars<T>(obj: T, objType: ProvablePure<T>): FieldVar[] {
  return objType.toFields(obj).map((f) => f.value);
}

export function assertIsFieldable<T extends any>(
  obj: T,
  msg = "Only provable types are supported in functions like this"
): asserts obj is T & ToFieldable {
  if (typeof (obj as any).constructor["toFields"] !== "function") {
    throw new Error(msg);
  }
}

export function cleanFieldVars(vars: FieldVar[]): FieldVar[] {
  return vars.map((fieldVar) => {
    if (Reflect.has(fieldVar, "protokit_tag")) {
      const clone: FieldVar = Object.assign([], fieldVar);
      Reflect.deleteProperty(clone, "protokit_tag");
      return clone;
    }
    return fieldVar;
  });
}
