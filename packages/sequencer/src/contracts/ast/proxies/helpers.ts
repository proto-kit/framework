import { OpcodeDefinitions, ASTExecutionContext, ToFieldable } from "../types";

export function genericProxyWithThis<Instructions extends OpcodeDefinitions, Call extends keyof Instructions, T extends (...args: any[]) => any>(
  f: T,
  call: Call,
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
      if(thisArg !== undefined){
        context.identifyObject(thisArg, "Constant");
      }
      argArray.forEach(arg => {
        context.identifyObject(arg, "Constant");
      });

      const boundTarget = target.bind(thisArg);
      const ret = context.pushCall<Call>(
        call,
        (...args: ToFieldable[]) => boundTarget(...args.slice(1)),
        [thisArg, ...argArray] as any // TODO
      );

      return ret;
    },
  });
}