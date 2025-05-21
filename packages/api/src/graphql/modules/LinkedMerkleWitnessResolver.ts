import { Arg, Field, ObjectType, Query } from "type-graphql";
import { inject } from "tsyringe";
import {
  LinkedMerkleTree,
  LinkedMerkleTreeReadWitness,
} from "@proto-kit/common";
import {
  AsyncLinkedLeafStore,
  CachedLinkedLeafStore,
} from "@proto-kit/sequencer";

import { GraphqlModule, graphqlModule } from "../GraphqlModule";

import { MerkleWitnessDTO } from "./MerkleWitnessResolver";
import { LeafDTO } from "./LeafResolver";

@ObjectType()
export class LinkedMerkleWitnessDTO {
  public static fromServiceLayerObject(witness: LinkedMerkleTreeReadWitness) {
    const { leaf, merkleWitness } = witness;
    const leafDTO = LeafDTO.fromServiceLayerModel(leaf);
    const witnessDTO = MerkleWitnessDTO.fromServiceLayerObject(merkleWitness);
    return new LinkedMerkleWitnessDTO(leafDTO, witnessDTO);
  }

  public constructor(leaf: LeafDTO, witness: MerkleWitnessDTO) {
    this.leaf = leaf;
    this.merkleWitness = new MerkleWitnessDTO(
      witness.siblings,
      witness.isLefts
    );
  }

  @Field(() => LeafDTO)
  public leaf: LeafDTO;

  @Field(() => MerkleWitnessDTO)
  public merkleWitness: MerkleWitnessDTO;
}

@graphqlModule()
export class LinkedMerkleWitnessResolver extends GraphqlModule<object> {
  public constructor(
    @inject("AsyncMerkleStore")
    private readonly treeStore: AsyncLinkedLeafStore
  ) {
    super();
  }

  @Query(() => LinkedMerkleWitnessDTO, {
    description:
      "Allows retrieval of merkle witnesses corresponding to a specific path in the appchain's state tree. These proves are generally retrieved from the current 'proven' state",
  })
  public async witness(@Arg("path") path: string) {
    const syncStore = await CachedLinkedLeafStore.new(this.treeStore);

    const tree = new LinkedMerkleTree(syncStore.treeStore, syncStore);
    await syncStore.preloadKey(BigInt(path));

    const witness = tree.getReadWitness(BigInt(path));

    return LinkedMerkleWitnessDTO.fromServiceLayerObject(witness);
  }
}
