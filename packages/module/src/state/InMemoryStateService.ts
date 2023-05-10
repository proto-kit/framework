import { Field } from 'snarkyjs';

export interface StateService {
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  get: (key: Field) => Field[] | undefined;
  set: (key: Field, value: Field[]) => void;
}

export class InMemoryStateService implements StateService {
  public values: Record<string, Field[]> = {};

  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  public get(key: Field): Field[] | undefined {
    return this.values[key.toString()];
  }

  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  public set(key: Field, value: Field[]) {
    this.values[key.toString()] = value;
  }
}
