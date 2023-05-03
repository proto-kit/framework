import {Circuit, Field, Struct} from "snarkyjs";

export function NotInCircuit() {
    return function F(target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
        const childFunction = descriptor.value
        descriptor.value = function(this: any, ...args: any[]) {
            if (Circuit.inCheckedComputation() || Circuit.inProver()) {
                // if (NjordConstants.CIRCUIT_CHECKS_ENABLED) {
                throw new Error("Method " + propertyKey.toString() + " is supposed to be only called outside of the circuit")
                // }
            }
            return childFunction.apply(this, args)
        }
        return descriptor
    }
}

export function structArrayToFields(...args: { toFields() : Field[] }[]) : Field[]{
    return args.map(x => x.toFields()).reduce((a, b) => a.concat(b), [])
}

export type ReturnType<T extends Function> = T extends ((...args: any[]) => infer R) ? R : any

export type ClassType = new(...args: any[]) => any