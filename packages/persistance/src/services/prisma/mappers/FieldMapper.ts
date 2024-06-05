import { Field } from "o1js";
import { singleton } from "tsyringe";

import { ObjectMapper } from "../../../ObjectMapper";

@singleton()
export class FieldMapper implements ObjectMapper<Field[], string> {
  public mapIn(input: string): Field[] {
    return input.split(";").map((s) => Field(s));
  }

  public mapOut(input: Field[]): string {
    return input.map((field) => field.toString()).join(";");
  }
}
