import { createMerkleTree } from "@proto-kit/common";
import { Field, Poseidon, Struct, VerificationKey } from "o1js";

export const treeFeeHeight = 10;
export class VKTree extends createMerkleTree(treeFeeHeight) {}
export class VKTreeWitness extends VKTree.WITNESS {}

export class RuntimeVerificationKeyAttestation extends Struct({
  verificationKey: VerificationKey,
  witness: VKTreeWitness,
}) {}

export class MethodVKConfigData extends Struct({
  methodId: Field,
  vkHash: Field,
}) {
  public hash() {
    return Poseidon.hash(MethodVKConfigData.toFields(this));
  }
}

export interface MinimalVKTreeService {
  getRoot: () => bigint;
}
