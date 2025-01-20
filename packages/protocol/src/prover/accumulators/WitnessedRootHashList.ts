import { Bool, Field, Struct } from "o1js";

import { DefaultProvableHashList } from "../../utils/ProvableHashList";

/**
 * Link between a certain applied batch stack and a given root hash that the
 * stack has to evaluate to at that given point in time
 */
export class WitnessedRoot extends Struct({
  appliedBatchListState: Field,
  root: Field,
}) {}

export class WitnessedRootWitness extends Struct({
  witnessedRoot: Field,
  preimage: Field,
}) {}

/**
 * Accumulator as of section "Intermediary state roots" of the STProver v2 spec
 */

export class WitnessedRootHashList extends DefaultProvableHashList<WitnessedRoot> {
  public constructor(commitment: Field = Field(0)) {
    super(WitnessedRoot, commitment);
  }

  // To be used by the STProver
  // public pushWitness() {}

  // To be used by the BlockProver
  public validateWitnessedRoot(
    witnessedRoot: WitnessedRoot,
    preimage: Field,
    condition: Bool
  ) {
    // Note, we don't have to validate the preimage here because of the following
    // 1. If the sequencer doesn't provide the correct witness, the BlockProver's
    //    equality check will fail
    // 2. If the list is empty, no preimage exists, therefore condition (2) doesn't
    //    apply, which is the same outcome when the sequencer provides an arbitrary witness
    const preimageCheckList = new WitnessedRootHashList(preimage).push(
      witnessedRoot
    );

    // Conditions:
    // (1) don't append if witnessedRoot == finalizedRoot  -> Already covered in BlockProver
    // (2) don't append if preimage.push({ finalizedRoot, pendingSTBatchesHash }) == this.commitment
    const skipPush = preimageCheckList.commitment.equals(this.commitment);

    return this.pushIf(witnessedRoot, condition.and(skipPush.not()));
  }
}
