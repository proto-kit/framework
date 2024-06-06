import {
  expectDefined,
  MockAsyncMerkleTreeStore,
  RollupMerkleTree,
  mapSequential,
} from "@proto-kit/common";
import { Field, PrivateKey, UInt64 as O1UInt64, Signature } from "o1js";
import {
  BlockProverPublicOutput,
  NetworkState,
  ProvableTransactionHook,
  RuntimeMethodExecutionContext,
  RuntimeTransaction,
  StateServiceProvider,
} from "@proto-kit/protocol";
import { ManualBlockTrigger } from "@proto-kit/sequencer";
import { InMemoryStateService } from "@proto-kit/module";
import { BalancesKey, TokenId, UInt64 } from "@proto-kit/library";

import { TestingAppChain } from "../../src/appChain/TestingAppChain";

import { TestBalances } from "./TestBalances";

// Failing - investigate why
describe.skip("blockProof", () => {
  it("should transition block state hash", async () => {
    expect.assertions(3);

    const merklestore = new MockAsyncMerkleTreeStore();
    const tree = new RollupMerkleTree(merklestore.store);

    const totalSupply = UInt64.from(10_000);

    const appChain = TestingAppChain.fromRuntime({
      Balances: TestBalances,
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

    const tokenId = TokenId.from(0);

    const tx1 = await appChain.transaction(alice, async () => {
      await balances.setBalance(tokenId, alice, UInt64.from(1000));
    });

    const context = appChain.runtime.dependencyContainer.resolve(
      RuntimeMethodExecutionContext
    );
    const runtimeSTs = context.current().result.stateTransitions;

    const stateService = new InMemoryStateService();

    const stateServiceProvider = new StateServiceProvider();
    stateServiceProvider.setCurrentStateService(stateService);

    appChain.registerValue({
      StateServiceProvider: stateServiceProvider,
    });

    context.setup({
      transaction: RuntimeTransaction.dummyTransaction(),
      networkState: NetworkState.empty(),
    });

    const balancesMethodId = appChain.runtime.methodIdResolver.getMethodId(
      "Balances",
      "setBalance"
    );

    const txHooks =
      appChain.protocol.dependencyContainer.resolveAll<ProvableTransactionHook>(
        "ProvableTransactionHook"
      );

    await mapSequential(txHooks, async (hook) => {
      await hook.onTransaction({
        transaction: RuntimeTransaction.fromTransaction({
          sender: alice,
          nonce: O1UInt64.from(0),
          methodId: Field(balancesMethodId),
          argsHash: Field(0),
        }),
        networkState: NetworkState.empty(),
        signature: Signature.create(PrivateKey.random(), [Field(0)]),
      });
    });

    const protocolSTs = context.current().result.stateTransitions;

    [...runtimeSTs, ...protocolSTs].forEach((st) => {
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

    expectDefined(provenBlock);
    const publicOutput = BlockProverPublicOutput.fromFields(
      provenBlock.proof.publicOutput.map((x) => Field(x))
    );

    expect(publicOutput.stateRoot.toBigInt()).toBe(tree.getRoot().toBigInt());

    const aliceBalance = await appChain.query.runtime.Balances.balances.get(
      new BalancesKey({
        tokenId,
        address: alice,
      })
    );

    expect(block?.transactions[0].status.toBoolean()).toBe(true);
    expect(aliceBalance?.toBigInt()).toBe(1000n);
  }, 120_000);
});
