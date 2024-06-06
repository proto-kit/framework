import { ConfigurableModule, NoConfig, TypedClass } from "@proto-kit/common";
import { SmartContract } from "o1js";

export type SmartContractClassFromInterface<Type> = typeof SmartContract &
  TypedClass<Type>;

/**
 * This module type is used to define a contract module that can be used to
 * construct and inject smart contract instances.
 * It defines a method contractFactory, whose arguments can be configured via
 * the Argument generic. It returns a smart contract class that is a subclass
 * of SmartContract and implements a certain interface as specified by the
 * ContractType generic.
 */
export abstract class ContractModule<
  ContractType,
  // undefined = no args
  Arguments = undefined,
  Config = NoConfig,
> extends ConfigurableModule<Config> {
  public abstract contractFactory(
    args: Arguments
  ): SmartContractClassFromInterface<ContractType>;
}
