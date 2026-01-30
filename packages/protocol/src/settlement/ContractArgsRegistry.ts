import { injectable, singleton } from "tsyringe";
import merge from "lodash/merge";

export interface StaticInitializationContract<Args> {
  getInitializationArgs(): Args;
}

export type NaiveObjectSchema<Obj> = {
  [Key in keyof Obj]: undefined extends Obj[Key] ? "Optional" : "Required";
};

/*
interface Test {
  one: string;
  two?: string;
}

const x: NaiveObjectSchema<Test> = {
  one: "Required",
  two: "Optional",
};
*/

@injectable()
@singleton()
export class ContractArgsRegistry {
  args: Record<string, any> = {};

  public addArgs<Type>(name: string, addition: Partial<Type>) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const args: Partial<Type> = this.args[name] ?? {};
    this.args[name] = merge(args, addition);
  }

  public resetArgs(name: string) {
    delete this.args[name];
  }

  public getArgs<Type>(name: string, schema: NaiveObjectSchema<Type>): Type {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const args = this.args[name] ?? {};

    const missing = Object.entries<"Optional" | "Required">(schema).filter(
      ([key, type]) => {
        // We filter only if the key is required and isn't present
        return type === "Required" && args[key] === undefined;
      }
    );

    if (missing.length > 0) {
      const missingKeys = missing.map(([key]) => key);
      throw new Error(
        `Contract args for ${name} not all present, ${missingKeys} are missing`
      );
    } else {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      return args as Type;
    }
  }
}
