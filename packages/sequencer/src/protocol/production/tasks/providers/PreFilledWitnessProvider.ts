import {
  InMemoryMerkleTreeStorage,
  RollupMerkleTree,
  RollupMerkleWitness,
  StateTransitionWitnessProvider
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

  public getWitness(key: Field): RollupMerkleWitness {
    // dummy ST
    if (key.equals(Field(0)).toBoolean()) {
      // return some witness here, it won't get checked in the circuit
      // eslint-disable-next-line @typescript-eslint/no-magic-numbers
      return new RollupMerkleTree(new InMemoryMerkleTreeStorage()).getWitness(0n);
    }

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
