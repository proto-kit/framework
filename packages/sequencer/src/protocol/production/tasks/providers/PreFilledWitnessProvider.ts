import {
  RollupMerkleWitness,
  StateTransitionWitnessProvider,
} from "@yab/protocol";
import { Field } from "snarkyjs";

const errors = {
  noWitnessAvailable: () =>
    new Error("No new witnesses are available, prefill empty"),

  keysDoNotMatch: () =>
    new Error("Key of provided witness and request do not match"),
};

export class PreFilledWitnessProvider
  implements StateTransitionWitnessProvider
{
  private readonly witnesses: RollupMerkleWitness[];

  public constructor(witnesses: RollupMerkleWitness[]) {
    // Reverse so that we can conviniently .pop() one-by-one
    this.witnesses = witnesses.reverse();
  }

  getWitness(key: Field): RollupMerkleWitness {
    const witness = this.witnesses.pop();
    if (witness === undefined) {
      throw errors.noWitnessAvailable();
    }
    if (!witness.calculateIndex().equals(key).toBoolean()) {
      throw errors.keysDoNotMatch();
    }
    return witness;
  }
}
