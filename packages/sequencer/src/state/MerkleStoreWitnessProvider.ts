import { injectable } from "tsyringe";
import {
  MerkleTreeStore,
  RollupMerkleTree,
  RollupMerkleWitness,
  StateTransitionWitnessProvider,
} from "@proto-kit/protocol";
import { Field } from "o1js";

@injectable()
export class MerkleStoreWitnessProvider
  implements StateTransitionWitnessProvider
{
  private readonly tree = new RollupMerkleTree(this.merkleStore);

  public constructor(private readonly merkleStore: MerkleTreeStore) {}

  public getWitness(key: Field): RollupMerkleWitness {
    return this.tree.getWitness(key.toBigInt());
  }
}
