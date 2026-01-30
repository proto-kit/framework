import { Field, Struct } from "o1js";

import { DefaultProvableHashList } from "../../utils/ProvableHashList";
import type { TransactionProverState } from "../transaction/TransactionProvable";
import { NetworkState } from "../../model/network/NetworkState";

export class BundlePreimage extends Struct({
  preimage: Field,
  fromStateTransitionsHash: Field,
  fromWitnessedRootsHash: Field,
}) {}

export class FieldTransition extends Struct({
  from: Field,
  to: Field,
}) {}

/**
 * A bundle represents an ordered list of transactions and their evaluated effects.
 * Specifically, this includes beforeTransaction, runtime and afterTransaction evaluation,
 * but not block hooks.
 */
export class Bundle extends Struct({
  // Those are per-block trackers
  networkStateHash: Field,
  transactionsHash: Field,

  // Those are non-linear trackers that we assert later in the blockprover
  pendingSTBatchesHash: FieldTransition,
  witnessedRootsHash: FieldTransition,
}) {}

/**
 * This hash list collects an ordered list of Bundle instances.
 * "Pushing" onto this list can mean either appending a new bundle or updating the
 * bundle at the tip of this list, according to the following rules:
 * The validated preimage (via checkLastBundleElement) is:
 * - == commitment: A new bundle will be appended
 * - something else: The preimage is the actual preimage, therefore as a operation,
 *   the old one will be popped (silently) and the updates bundle will be pushed,
 *   resulting in an semantic update of the tip.
 */
export class BundleHashList extends DefaultProvableHashList<Bundle> {
  public constructor(
    commitment: Field = Field(0),
    // TODO Refactor this into preimage and "auxiliary batch information" - this is confusing
    public preimage?: BundlePreimage
  ) {
    super(Bundle, commitment);
  }

  /** Verifies this list's preimage against the prover's state
   * The main impact this function has is that it makes the preimage trusted
   * i.e. we can safely use it to add to the bundle/open a new bundle
   */
  public checkLastBundleElement(
    state: TransactionProverState,
    networkState: NetworkState
  ) {
    const { preimage, fromWitnessedRootsHash, fromStateTransitionsHash } =
      this.preimage!;

    // Check and append to bundlelist
    const lastElement = new Bundle({
      networkStateHash: networkState.hash(),
      transactionsHash: state.transactionList.commitment,
      pendingSTBatchesHash: {
        from: fromStateTransitionsHash,
        to: state.pendingSTBatches.commitment,
      },
      witnessedRootsHash: {
        from: fromWitnessedRootsHash,
        to: state.witnessedRoots.commitment,
      },
    });

    const newBundle = this.commitment.equals(preimage);
    this.witnessTip(preimage, lastElement)
      .or(newBundle)
      .assertTrue("Last element not valid");

    newBundle
      .implies(state.transactionList.isEmpty())
      .assertTrue("Transaction list not empty for new bundle");
  }

  /**
   * This function pushes a new bundle onto this list or updates the bundle at
   * the tip of this list, according to the rules of the preimage algorithms (see class docs)
   */
  public addToBundle(
    state: TransactionProverState,
    networkState: NetworkState
  ) {
    const { preimage, fromWitnessedRootsHash, fromStateTransitionsHash } =
      this.preimage!;

    const newElement = new Bundle({
      networkStateHash: networkState.hash(),
      transactionsHash: state.transactionList.commitment,
      pendingSTBatchesHash: {
        from: fromStateTransitionsHash,
        to: state.pendingSTBatches.commitment,
      },
      witnessedRootsHash: {
        from: fromWitnessedRootsHash,
        to: state.witnessedRoots.commitment,
      },
    });

    // We always overwrite here, the invariant is that the preimage is
    // either the actual preimage in case of addition to the existing bundle
    // or the current commitment in case of a new bundle
    this.commitment = preimage;
    this.push(newElement);
  }
}
