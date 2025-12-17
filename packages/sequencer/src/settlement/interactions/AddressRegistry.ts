import { PublicKey } from "o1js";

export interface AddressRegistry {
  getContractAddress(identifier: string): PublicKey | undefined;

  addContractAddress(identifier: string, address: PublicKey): void;
}

export class InMemoryAddressRegistry implements AddressRegistry {
  addresses: Record<string, PublicKey> = {};

  addContractAddress(identifier: string, address: PublicKey): void {
    this.addresses[identifier] = address;
  }

  getContractAddress(identifier: string): PublicKey {
    return this.addresses[identifier];
  }
}
