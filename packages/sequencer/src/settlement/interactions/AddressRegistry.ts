import { PublicKey } from "o1js";

export interface AddressRegistry {
  getIdentifier(name: string, tokenId?: bigint): string;

  getContractAddress(identifier: string): PublicKey | undefined;

  addContractAddress(identifier: string, address: PublicKey): void;

  hasContractAddress(identifier: string): boolean;
}

export class InMemoryAddressRegistry implements AddressRegistry {
  addresses: Record<string, PublicKey> = {};

  getIdentifier(name: string, tokenId?: bigint) {
    return `${name}-${tokenId}`;
  }

  addContractAddress(identifier: string, address: PublicKey): void {
    this.addresses[identifier] = address;
  }

  getContractAddress(identifier: string): PublicKey {
    return this.addresses[identifier];
  }

  hasContractAddress(identifier: string): boolean {
    return this.addresses[identifier] !== undefined;
  }
}
