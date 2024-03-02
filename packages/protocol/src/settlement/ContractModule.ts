import { ConfigurableModule, NoConfig, TypedClass } from "@proto-kit/common";
import { SmartContract } from "o1js";

export type SmartContractClassFromInterface<Type> = typeof SmartContract &
  TypedClass<Type>;

export abstract class ContractModule<
  ContractType,
  // no args
  Arguments = undefined,
  Config = NoConfig
> extends ConfigurableModule<Config> {
  public abstract contractFactory(
    args: Arguments
  ): SmartContractClassFromInterface<ContractType>;
}
