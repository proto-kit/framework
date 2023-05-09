import type { Field } from "snarkyjs";
import { RollupMerkleWitness } from "../utils/RollupMerkleTree.js";
import { injectable, registry } from "tsyringe";

export interface StateTransitionWitnessProvider {

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