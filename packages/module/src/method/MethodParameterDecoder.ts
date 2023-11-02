/* eslint-disable no-underscore-dangle */
import { FlexibleProvable, ProvableExtended } from "o1js";

import { RuntimeModule } from "../runtime/RuntimeModule";

const errors = {
  typeNotCompatible: (name: string) =>
    new Error(
      `Cannot decode type ${name}, it has to be either a Struct, CircuitValue or built-in snarkyjs type`
    ),
};

export class MethodParameterDecoder {
  public static fromMethod(target: RuntimeModule<unknown>, methodName: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const paramtypes: ProvableExtended<unknown>[] = Reflect.getMetadata(
      "design:paramtypes",
      target,
      methodName
    );

    if (paramtypes === undefined) {
      throw new Error(
        `Method with name ${methodName} doesn't exist on this module`
      );
    }

    return new MethodParameterDecoder(paramtypes);
  }

  public static fieldSize(type: ProvableExtended<unknown>): number | undefined {
    // as any, since we shouldn't be using this workaround in the first place
    return (type as any).prototype._fields?.length ?? type.sizeInFields?.();
  }

  private constructor(private readonly types: ProvableExtended<unknown>[]) {}

  public fromJSON(argsJSON: string[]): FlexibleProvable<unknown>[] {
    return this.types.map((type, index) => {
      // eslint-disable-next-line @typescript-eslint/init-declarations
      let value: FlexibleProvable<unknown>;

      try {
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        value = type.fromJSON(
          JSON.parse(argsJSON[index])
        ) as FlexibleProvable<unknown>;
      } catch {
        throw errors.typeNotCompatible(type.constructor.name);
      }

      return value;
    });
  }

  public get fieldSize(): number {
    return this.types
      .map((type) => MethodParameterDecoder.fieldSize(type) ?? 0)
      .reduce((a, b) => a + b, 0);
  }
}
