import { TaskSerializer } from "./Task";

export const JSONTaskSerializer = {
  fromType<Type>(): TaskSerializer<Type> {
    return {
      fromJSON(json: string): Type {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        return JSON.parse(json) as Type;
      },

      toJSON(input: Type): string {
        return JSON.stringify(input);
      },
    };
  },
};
