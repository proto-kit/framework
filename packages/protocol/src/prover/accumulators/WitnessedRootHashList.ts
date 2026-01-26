import { Bool, Field, Provable, Struct } from "o1js";

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
  // preimage: Field,
}) {}

/**
 * Accumulator as of section "Intermediary state roots" of the STProver v2 spec
 */

export class WitnessedRootHashList extends DefaultProvableHashList<WitnessedRoot> {
  public constructor(
    commitment: Field = Field(0),
    public preimage: Field = Field(0)
  ) {
    super(WitnessedRoot, commitment);
  }

  /**
   * To be used by the BlockProver or for tracing
   *
   * The main purpose of this method compared to the simple push methods
   * is for deduplicating witnessed roots. We need to do this because the
   * STProver can only witness once per batch, therefore if multiple witness
   * points fall back to the same ST (because any batches in between were empty),
   * this has to be detected and compensated for.
   * This function does this using the preimage of the current list state.
   *
   * @param preimage The preimage to the **current** state of the list.
   */
  public witnessRoot(witnessedRoot: WitnessedRoot, condition: Bool) {
    // Note, we don't have to validate the preimage here because of the following
    // 1. If the sequencer doesn't provide the correct witness, the BlockProver's
    //    equality check will fail
    // 2. If the list is empty, no preimage exists, therefore condition (2) doesn't
    //    apply, which is the same outcome when the sequencer provides an arbitrary witness
    const preimageCheckList = new WitnessedRootHashList(this.preimage).push(
      witnessedRoot
    );

    // Conditions:
    // (1) don't append if witnessedRoot == finalizedRoot -> Already covered in BlockProver
    // (2) don't append if preimage.push({ finalizedRoot, pendingSTBatchesHash }) == this.commitment
    const skipPush = preimageCheckList.commitment.equals(this.commitment);

    // Provable.log("preimage", preimage);
    Provable.log("Pushing witnessed root", witnessedRoot, skipPush);

    const fromCommitment = this.commitment;

    const pushCondition = condition.and(skipPush.not());
    this.pushIf(witnessedRoot, pushCondition);

    this.preimage = Provable.if(pushCondition, fromCommitment, this.preimage);
    Provable.log(this.commitment);
  }
}
