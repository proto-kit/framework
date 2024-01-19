import { Arg, Field, ObjectType, Query } from "type-graphql";
import { Length } from "class-validator";
import { inject } from "tsyringe";
import { RollupMerkleTree, RollupMerkleTreeWitness } from "@proto-kit/common";
import {
  AsyncMerkleTreeStore,
  CachedMerkleTreeStore,
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

@graphqlModule()
export class MerkleWitnessResolver extends GraphqlModule<object> {
  public constructor(
    @inject("AsyncMerkleStore") private readonly treeStore: AsyncMerkleTreeStore
  ) {
    super();
  }

  @Query(() => MerkleWitnessDTO)
  public async witness(@Arg("path") path: string) {
    const syncStore = new CachedMerkleTreeStore(this.treeStore);
    await syncStore.preloadKey(BigInt(path));

    const tree = new RollupMerkleTree(syncStore);

    const witness = tree.getWitness(BigInt(path));

    return MerkleWitnessDTO.fromServiceLayerObject(witness);
  }
}
