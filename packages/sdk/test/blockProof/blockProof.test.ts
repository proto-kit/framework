import { PrivateKey, UInt64 } from "o1js";
import { RuntimeMethodExecutionContext } from "@proto-kit/protocol";

import { TestingAppChain } from "@proto-kit/sdk";

import { Balances } from "./Balances";
import { MockAsyncMerkleTreeStore, RollupMerkleTree } from "@proto-kit/common";
import { ManualBlockTrigger } from "@proto-kit/sequencer";

describe("blockProof", () => {
  // eslint-disable-next-line max-statements
  it("should transition block state hash", async () => {
    expect.assertions(3);

    const merklestore = new MockAsyncMerkleTreeStore();
    const tree = new RollupMerkleTree(merklestore.store);

    const totalSupply = UInt64.from(10_000);

    const appChain = TestingAppChain.fromRuntime({
      modules: {
        Balances,
      },
    });

    appChain.configurePartial({
      Runtime: {
        Balances: {
          totalSupply,
        },
      },
    });

    await appChain.start();

    const alicePrivateKey = PrivateKey.random();
    const alice = alicePrivateKey.toPublicKey();

    appChain.setSigner(alicePrivateKey);

    const balances = appChain.runtime.resolve("Balances");

    const tx1 = await appChain.transaction(alice, () => {
      balances.setBalance(alice, UInt64.from(1000));
    });

    const context = appChain.runtime.dependencyContainer.resolve(
      RuntimeMethodExecutionContext
    );
    const transitions = context.current().result.stateTransitions;

    [transitions[1], transitions[3]].forEach((st) => {
      const provable = st.toProvable();
      tree.setLeaf(provable.path.toBigInt(), provable.to.value);
    });

    await tx1.sign();
    await tx1.send();

    const block = await appChain.produceBlock();

    const trigger = appChain.sequencer.resolveOrFail(
      "BlockTrigger",
      ManualBlockTrigger
    );
    const provenBlock = await trigger.produceProven();

    expect(provenBlock?.proof.publicOutput.stateRoot.toBigInt()).toBe(
      tree.getRoot().toBigInt()
    );

    const aliceBalance = await appChain.query.runtime.Balances.balances.get(
      alice
    );

    expect(block?.transactions[0].status.toBoolean()).toBe(true);
    expect(aliceBalance?.toBigInt()).toBe(1000n);
  }, 120_000);
});
