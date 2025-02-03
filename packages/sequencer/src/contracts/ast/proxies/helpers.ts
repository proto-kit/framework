import { OpcodeDefinitions, ASTExecutionContext, ToFieldable } from "../types";
import { ProvablePure } from "o1js";

export function genericProxyWithThis<Instructions extends OpcodeDefinitions, Call extends keyof Instructions, T extends (...args: any[]) => any>(
  f: T,
  call: Call,
  // TODO ArgTypes and returnType can be inferred from the instruction itself
  argTypes: ProvablePure<any>[],
  returnType: ProvablePure<any>,
  contextF: () => ASTExecutionContext<Instructions>
) {
  return new Proxy(f, {
    apply(
      target: T,
      thisArg: ToFieldable,
      argArray: ToFieldable[]
    ): any {
      const context = contextF();
      if (!context.capturing) {
        return Reflect.apply(target, thisArg, argArray);
      }
      let argsUsed = 0;
      if(thisArg !== undefined){
        context.identifyObject(thisArg, argTypes[argsUsed], "Constant");
        argsUsed++;
      }
      argArray.forEach((arg, index) => {
        context.identifyObject(arg, argTypes[index + argsUsed], "Constant");
      });

      const boundTarget = target.bind(thisArg);
      const ret = context.pushCall<Call>(
        call,
        (...args: ToFieldable[]) => boundTarget(...args.slice(1)),
        [thisArg, ...argArray] as any, // TODO
      );

      return ret;
    },
  });
}