import {
  Field,
  FlexibleProvable,
  Poseidon,
  PublicKey,
  Signature,
  Struct,
  UInt64,
} from "snarkyjs";

function argsToHash(...args: FlexibleProvable<any>[]): Field {
  const fields = args.flatMap((argument) => argument.toFields(argument));
  return Poseidon.hash(fields);
}

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
