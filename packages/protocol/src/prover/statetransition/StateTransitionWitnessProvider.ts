import type { Field } from "o1js";
import { injectable } from "tsyringe";
import { RollupMerkleTreeWitness } from "@proto-kit/common";

/**
 * Interface for providing merkle witnesses to the state-transition prover
 */
export interface StateTransitionWitnessProvider {
  /**
   * Provides the merkle witness corresponding to the given key
   * @param key Merkle-tree key
   */
  getWitness: (key: Field) => RollupMerkleTreeWitness;
}

@injectable()
export class NoOpStateTransitionWitnessProvider
  implements StateTransitionWitnessProvider
{
  public getWitness(): RollupMerkleTreeWitness {
    return new RollupMerkleTreeWitness({ path: [], isLeft: [] });
  }
}
