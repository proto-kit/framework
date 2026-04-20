import { Arg, Field, ObjectType, Query } from "type-graphql";
import { Length } from "class-validator";
import { inject } from "tsyringe";
import {
  LinkedLeafStruct,
  LinkedMerkleTree,
  LinkedMerkleTreeReadWitness,
  RollupMerkleTreeWitness,
} from "@proto-kit/common";
import {
  AsyncLinkedLeafStore,
  AsyncMerkleTreeStore,
  CachedLinkedLeafStore,
} from "@proto-kit/sequencer";

import { GraphqlModule, graphqlModule } from "../GraphqlModule";

@ObjectType()
export class MerkleWitnessDTO {
  public static fromServiceLayerObject(witness: RollupMerkleTreeWitness) {
    const siblings = witness.path.map((item) => item.toString());
    const isLefts = witness.isLeft.map((item) => item.toBoolean());
    return new MerkleWitnessDTO(siblings, isLefts);
  }

  public constructor(siblings: string[], isLefts: boolean[]) {
    this.siblings = siblings;
    this.isLefts = isLefts;
  }

  @Field(() => [String])
  @Length(255)
  public siblings: string[];

  @Field(() => [Boolean])
  @Length(255)
  public isLefts: boolean[];
}

@ObjectType()
export class LinkedLeafDTO {
  public static fromServiceLayerObject({
    path,
    value,
    nextPath,
  }: LinkedLeafStruct) {
    return new LinkedLeafDTO(
      path.toString(),
      value.toString(),
      nextPath.toString()
    );
  }

  constructor(path: string, value: string, nextPath: string) {
    this.path = path;
    this.value = value;
    this.nextPath = nextPath;
  }

  @Field(() => String)
  public path: string;

  @Field(() => String)
  public value: string;

  @Field(() => String)
  public nextPath: string;
}

@ObjectType()
export class LinkedTreeWitnessDTO {
  public static fromServiceLayerObject(witness: LinkedMerkleTreeReadWitness) {
    const merkleWitness = MerkleWitnessDTO.fromServiceLayerObject(
      witness.merkleWitness
    );
    const linkedLeaf = LinkedLeafDTO.fromServiceLayerObject(witness.leaf);
    return new LinkedTreeWitnessDTO(merkleWitness, linkedLeaf);
  }

  public constructor(merkleWitness: MerkleWitnessDTO, leaf: LinkedLeafDTO) {
    this.merkleWitness = merkleWitness;
    this.leaf = leaf;
  }

  @Field(() => MerkleWitnessDTO)
  public merkleWitness: MerkleWitnessDTO;

  @Field(() => LinkedLeafDTO)
  public leaf: LinkedLeafDTO;
}

@graphqlModule()
export class MerkleWitnessResolver extends GraphqlModule<object> {
  public constructor(
    @inject("AsyncLinkedLeafStore")
    private readonly leafStore: AsyncLinkedLeafStore,
    @inject("AsyncTreeStore")
    private readonly treeStore: AsyncMerkleTreeStore
  ) {
    super();
  }

  @Query(() => LinkedTreeWitnessDTO, {
    description:
      "Allows retrieval of merkle witnesses corresponding to a specific path in the appchain's state tree. These proves are generally retrieved from the current 'proven' state",
  })
  public async witness(@Arg("path") path: string) {
    const syncStore = await CachedLinkedLeafStore.new(
      this.leafStore,
      this.treeStore
    );
    await syncStore.preloadKey(BigInt(path));

    const tree = new LinkedMerkleTree(syncStore.treeStore, syncStore);

    const witness = tree.getReadWitness(BigInt(path));

    return LinkedTreeWitnessDTO.fromServiceLayerObject(witness);
  }
}
