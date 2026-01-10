import { PublicKey } from "o1js";

export interface DeployInteraction {
  deploy(
    addresses: {
      settlementContract: PublicKey;
      dispatchContract: PublicKey;
    },
    options?: { nonce?: number }
  ): void;
}
