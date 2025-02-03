import { Field, PublicKey } from "o1js";

/**
 * Interface for cross-contract call authorization
 * See https://github.com/proto-kit/framework/issues/202#issuecomment-2407263173
 */
export interface ContractAuthorization {
  target: PublicKey;

  hash: () => Field;
}
