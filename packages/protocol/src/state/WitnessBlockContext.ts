import { container, singleton } from "tsyringe";
import { Provable } from "o1js";

@singleton()
export class WitnessBlockContext {
  public witnessBlockDepth: number = 0;

  public get isInWitnessBlock() {
    return this.witnessBlockDepth > 0;
  }
}

const asyncProxyWitnessFunction = <
  Ret,
  F extends (...args: any[]) => Promise<Ret>,
>(
  originalFuncDef: F
) => {
  return async (...args: Parameters<F>) => {
    const context = container.resolve(WitnessBlockContext);
    context.witnessBlockDepth += 1;
    const ret = await originalFuncDef(...args);
    context.witnessBlockDepth -= 1;
    return ret;
  };
};

const proxySyncWitnessFunction = <
  Params extends any[],
  Ret,
  F extends (...args: Params) => Ret,
>(
  originalFuncDef: F
) => {
  return (...args: Params): Ret => {
    const context = container.resolve(WitnessBlockContext);
    context.witnessBlockDepth += 1;
    const ret = originalFuncDef(...args);
    context.witnessBlockDepth -= 1;
    return ret;
  };
};

Provable.witnessAsync = asyncProxyWitnessFunction(Provable.witnessAsync);

Provable.witness = proxySyncWitnessFunction(Provable.witness);

Provable.witnessFields = proxySyncWitnessFunction(Provable.witnessFields);

Provable.asProver = proxySyncWitnessFunction(Provable.asProver);
