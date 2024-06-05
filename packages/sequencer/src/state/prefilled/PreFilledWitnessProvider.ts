import { StateTransitionWitnessProvider } from "@proto-kit/protocol";
import {
  InMemoryMerkleTreeStorage,
  RollupMerkleTree,
  RollupMerkleTreeWitness,
} from "@proto-kit/common";
import { Field } from "o1js";

const errors = {
  noWitnessAvailable: () =>
    new Error("No new witnesses are available, prefill empty"),

  keysDoNotMatch: () =>
    new Error("Key of provided witness and request do not match"),
};

export class PreFilledWitnessProvider
  implements StateTransitionWitnessProvider
{
  private readonly witnesses: RollupMerkleTreeWitness[];

  private cursor = 0;

  public constructor(witnesses: RollupMerkleTreeWitness[]) {
    // Reverse so that we can conviniently .pop() one-by-one
    this.witnesses = witnesses;
  }

  public getWitness(key: Field): RollupMerkleTreeWitness {
    // dummy ST
    if (key.equals(Field(0)).toBoolean()) {
      // return some witness here, it won't get checked in the circuit

      return new RollupMerkleTree(new InMemoryMerkleTreeStorage()).getWitness(
        BigInt(0)
      );
    }

    const witness = this.witnesses[this.cursor % this.witnesses.length];

    // TODO Introduce something that throws this if it overflows before a new prover run begins
    // if (witness === undefined) {
    //   throw errors.noWitnessAvailable();
    // }

    const computedKey = witness.calculateIndex();

    if (!computedKey.equals(key).toBoolean()) {
      throw errors.keysDoNotMatch();
    }
    this.cursor += 1;
    return witness;
  }
}
