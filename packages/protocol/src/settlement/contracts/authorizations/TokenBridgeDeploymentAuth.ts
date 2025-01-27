import { Field, Poseidon, PublicKey, Struct } from "o1js";

import { ContractAuthorization } from "./ContractAuthorization";

export class TokenBridgeDeploymentAuth
  extends Struct({
    target: PublicKey,
    tokenId: Field,
    address: PublicKey,
  })
  implements ContractAuthorization
{
  public hash() {
    return Poseidon.hash(TokenBridgeDeploymentAuth.toFields(this));
  }
}
