// eslint-disable-next-line @typescript-eslint/ban-types
import { Circuit, Field, Poseidon } from "snarkyjs";
import { TextEncoder } from "node:util";

export type ReturnType<T extends Function> = T extends ((...args: any[]) => infer R) ? R : any

export type ClassType = new(...args: any[]) => any

export type TypedClassType<T> = new(...args: any[]) => T

export type Subclass<Class extends new (...args: any) => any> = (new (
  ...args: any
) => InstanceType<Class>) & {
  [K in keyof Class]: Class[K];
} & { prototype: InstanceType<Class> };

export function NotInCircuit() {
  return function F(target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const childFunction = descriptor.value;
    descriptor.value = function value(this: any, ...args: any[]) {
      if (Circuit.inCheckedComputation() || Circuit.inProver()) {
        throw new Error(`Method ${  propertyKey.toString()  } is supposed to be only called outside of the circuit`);
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
      return childFunction.apply(this, args);
    };
    return descriptor;
  };
}

export function stringToField(value: string) {
  const fieldSize = Field.sizeInBytes();

  const encoder = new TextEncoder();
  function stringToBytes(s: string) : number[] {
    return Array.from(encoder.encode(s));
  }

  const stringBytes = stringToBytes(value);

  const padding = Array.from<number>({ length: fieldSize - stringBytes.length }).fill(0)
  const data = stringBytes.concat(padding)

  if(data.length > fieldSize){

    let chunks = data.reduce((a, b, i) => {
      let arrIndex = i / fieldSize
      if(a.length <= arrIndex){
        a.push([])
      }
      a[arrIndex].push(b)
      return a
    }, [] as number[][])
    return Poseidon.hash(chunks.map(x => Field.fromBytes(x)))

  }else{
    return Field.fromBytes(
      data
    );
  }

}

