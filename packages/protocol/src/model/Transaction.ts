import {
  Field,
  FlexibleProvable,
  Poseidon,
  PublicKey,
  Signature,
  Struct,
  UInt64,
} from "o1js";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function argsToHash(...args: FlexibleProvable<any>[]): Field {
  const fields = args.flatMap((argument) => argument.toFields(argument));
  return Poseidon.hash(fields);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
class Transaction extends Struct({
  // must be checked inside @runtimeMethod
  methodId: Field,
  // constructed by hashing args + appending all used proof input/output hashes at the end
  argsHash: Field,
  // must (due to nonce) be checked during applyTransaction
  nonce: UInt64,
  sender: PublicKey,
  signature: Signature,
}) {
  public toHash(): Field {
    return Poseidon.hash(Transaction.toFields(this));
  }
}
