import { Field, Poseidon, PublicKey, Struct } from "o1js";

import { ContractAuthorization } from "./ContractAuthorization";

export class UpdateMessagesHashAuth
  extends Struct({
    target: PublicKey,
    executedMessagesHash: Field,
    newPromisedMessagesHash: Field,
  })
  implements ContractAuthorization
{
  public hash() {
    return Poseidon.hash(UpdateMessagesHashAuth.toFields(this));
  }
}
