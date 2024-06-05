import { Field } from "o1js";
import { RollupMerkleTree, log } from "@proto-kit/common";

import { CachedMerkleTreeStore, InMemoryAsyncMerkleTreeStore } from "../../src";

describe("merkle tree caching", () => {
  it("should cache, merge and cache again correctly", async () => {
    expect.assertions(1);
    log.setLevel(log.levels.INFO);

    const asyncService = new InMemoryAsyncMerkleTreeStore();
    const cachedStore1 = new CachedMerkleTreeStore(asyncService);
    const tree = new RollupMerkleTree(cachedStore1);

    tree.setLeaf(
      BigInt(
        "8315128407888076827747583618264069725166559532323886730251648126140875106375"
      ),
      Field(
        "7555220006856562833147743033256142154591945963958408607501861037584894828141"
      )
    );
    tree.setLeaf(
      BigInt(
        "1135724539086759849828193257478967224998007355448882542027535720593543464209"
      ),
      Field(
        "1259702704738371196984972831885384469288156549426257425022876410209069764640"
      )
    );

    await cachedStore1.mergeIntoParent();

    const cachedStore2 = new CachedMerkleTreeStore(asyncService);

    await cachedStore2.preloadKey(
      BigInt(
        "135413826711051814106331721573646171856233955198202976565146349582599235605"
      )
    );
    await cachedStore2.preloadKey(
      BigInt(
        "187096936125835301165703149714221977896269014196675103496127974415786508468"
      )
    );

    const tree2 = new RollupMerkleTree(cachedStore2);

    tree2.setLeaf(
      BigInt(
        "135413826711051814106331721573646171856233955198202976565146349582599235605"
      ),
      Field(
        "7555220006856562833147743033256142154591945963958408607501861037584894828141"
      )
    );
    tree2.setLeaf(
      BigInt(
        "187096936125835301165703149714221977896269014196675103496127974415786508468"
      ),
      Field(
        "12719911732789803963178147640045939094940211306984772742957499065837303164652"
      )
    );

    const witness = tree2.getWitness(
      BigInt(
        "135413826711051814106331721573646171856233955198202976565146349582599235605"
      )
    );
    expect(
      witness
        .calculateRoot(
          Field(
            "7555220006856562833147743033256142154591945963958408607501861037584894828141"
          )
        )
        .toString()
    ).toEqual(tree2.getRoot().toString());
  });
});
