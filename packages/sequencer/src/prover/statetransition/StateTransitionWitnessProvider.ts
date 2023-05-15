import type { Field } from "snarkyjs";
import { RollupMerkleWitness } from "../utils/RollupMerkleTree.js";
import { injectable, registry } from "tsyringe";

/**
 * Interface for providing merkle witnesses to the state-transition prover
 */
export interface StateTransitionWitnessProvider {

  /**
   * Provides the merkle witness corresponding to the given key
   * @param key Merkle-tree key
   */
  getWitness: (key: Field) => RollupMerkleWitness;

}

@injectable()
@registry([{ // Doesn't work
  token: "StateTransitionWitnessProvider",
  useClass: NoOpStateTransitionWitnessProvider
}])
export class NoOpStateTransitionWitnessProvider implements StateTransitionWitnessProvider {

  public getWitness(): RollupMerkleWitness {
    return new RollupMerkleWitness({ path: [], isLeft: [] });
  }

}