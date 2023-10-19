import { PrivateKey, UInt64 } from "o1js";
import { log } from "@proto-kit/common";
import {
  RollupMerkleTree,
  RuntimeMethodExecutionContext,
} from "@proto-kit/protocol";
import { MockAsyncMerkleTreeStore } from "@proto-kit/module/test/state/MockAsyncMerkleStore";

import { TestingAppChain } from "@proto-kit/sdk";

import { Balances } from "./Balances";

describe("balances", () => {
  // eslint-disable-next-line max-statements
  it("should demonstrate how balances work", async () => {
    expect.assertions(6);

    log.setLevel("DEBUG");

    const merklestore = new MockAsyncMerkleTreeStore();
    const tree = new RollupMerkleTree(merklestore.store);

    const totalSupply = UInt64.from(10_000);

    const appChain = TestingAppChain.fromRuntime({
      modules: {
        Balances,
      },

      config: {
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

    const tx1 = appChain.transaction(alice, () => {
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

    const block1 = await appChain.produceBlock();

    expect(block1?.proof.publicOutput.stateRoot.toBigInt()).toBe(
      tree.getRoot().toBigInt()
    );

    const aliceBalance1 = await appChain.query.Balances.balances.get(alice);

    expect(block1?.txs[0].status).toBe(true);
    expect(aliceBalance1?.toBigInt()).toBe(1000n);

    console.log("----------- Block2 -------------");

    const bobPrivateKey = PrivateKey.random();
    const bob = bobPrivateKey.toPublicKey();

    const tx2 = appChain.transaction(alice, () => {
      balances.transfer(alice, bob, UInt64.from(100));
    });

    await tx2.sign();
    await tx2.send();

    const block2 = await appChain.produceBlock();

    expect(block2?.txs[0].status).toBe(true);

    const aliceBalance2 = await appChain.query.Balances.balances.get(alice);
    const bobBalance1 = await appChain.query.Balances.balances.get(bob);

    expect(aliceBalance2?.toBigInt()).toBe(900n);
    expect(bobBalance1?.toBigInt()).toBe(100n);
  }, 120_000);
});
