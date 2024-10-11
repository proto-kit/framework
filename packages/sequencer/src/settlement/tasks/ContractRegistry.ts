import { TypedClass } from "@proto-kit/common";
import { SmartContract } from "o1js";

/**
 * o1js internally uses the class-name of contracts to resolve and compute lazy-proofs
 * Since we use a modular architecture and often have a base-class/implementation-class
 * patterns to make reusing code easier, some lazy-proofs have the class names of
 * superclasses of the actual contract classes.
 * This class helps to resolve the correct class during de-serialization of transactions
 */
export class ContractRegistry {
  public constructor(
    private readonly contract: Record<string, typeof SmartContract>
  ) {}

  private isSubtypeOfName(clas: TypedClass<unknown>, name: string): boolean {
    if (clas.name === name) {
      return true;
    }
    if (clas.name === "SmartContract") {
      return false;
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return this.isSubtypeOfName(Object.getPrototypeOf(clas), name);
  }

  public getContractClassByName(
    name: string
  ): typeof SmartContract | undefined {
    const clas = this.contract[name];
    if (clas === undefined) {
      // Fall back to finding by class.name
      return Object.values(this.contract).find((entry) =>
        this.isSubtypeOfName(entry, name)
      );
    }
    return clas;
  }
}
