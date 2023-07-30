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
  private cursor: number = 0;

  public constructor(witnesses: RollupMerkleWitness[]) {
    // Reverse so that we can conviniently .pop() one-by-one
    this.witnesses = witnesses;
  }

  public getWitness(key: Field): RollupMerkleWitness {
    console.log(`getWitness key ${key.toString()}`);
    // dummy ST
    if (key.equals(Field(0)).toBoolean()) {
      // return some witness here, it won't get checked in the circuit
      // eslint-disable-next-line @typescript-eslint/no-magic-numbers
      return new RollupMerkleTree(new InMemoryMerkleTreeStorage()).getWitness(0n);
    }

    const witness = this.witnesses[this.cursor % this.witnesses.length];
    // eslint-disable-next-line no-warning-comments
    // TODO Introduce something that throws this if it overflows before a new prover run begins
    // if (witness === undefined) {
    //   throw errors.noWitnessAvailable();
    // }

    if (!witness.calculateIndex().equals(key).toBoolean()) {
      throw errors.keysDoNotMatch();
    }
    this.cursor++;
    return witness;
  }
}
