import {Circuit} from "snarkyjs";

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
