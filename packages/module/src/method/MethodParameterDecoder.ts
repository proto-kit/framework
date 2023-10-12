import { FlexibleProvable, ProvableExtended } from "snarkyjs";

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

    return new MethodParameterDecoder(paramtypes);
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
}
