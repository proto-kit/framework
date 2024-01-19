import { injectable } from "tsyringe";
import { StateTransitionWitnessProvider } from "@proto-kit/protocol";
import {
  MerkleTreeStore,
  RollupMerkleTree,
  RollupMerkleTreeWitness,
} from "@proto-kit/common";
import { Field } from "o1js";

@injectable()
export class MerkleStoreWitnessProvider
  implements StateTransitionWitnessProvider
{
  private readonly tree = new RollupMerkleTree(this.merkleStore);

  public constructor(private readonly merkleStore: MerkleTreeStore) {}

  public getWitness(key: Field): RollupMerkleTreeWitness {
    return this.tree.getWitness(key.toBigInt());
  }
}
