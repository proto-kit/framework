import { Poseidon, PrivateKey, UInt32, Encoding, UInt64, Field } from "snarkyjs";
import { NFTKey, tst } from "./tst";
import { log, range } from "@proto-kit/common";
import {
  AppChain,
  InMemorySigner,
  InMemoryTransactionSender,
  StateServiceQueryModule
} from "@proto-kit/sdk";
import {
  Fieldable,
  InMemoryStateService,
  MethodIdResolver,
  Runtime,
  RuntimeModulesRecord
} from "@proto-kit/module";
import {
  AsyncStateService,
  BlockProducerModule, BlockTrigger, LocalTaskQueue,
  LocalTaskWorkerModule, ManualBlockTrigger,
  NoopBaseLayer,
  PrivateMempool,
  Sequencer, TaskQueue, UnsignedTransaction
} from "../../../src";
import {
  AccountStateModule,
  BlockProver,
  Path,
  Protocol,
  StateTransitionProver,
  VanillaProtocol,
} from "@proto-kit/protocol";
import { Balance } from "../mocks/Balance";

log.setLevel(log.levels.DEBUG);

describe("TST", () => {
  let runtime: Runtime<{ tst: typeof tst }>;
  let sequencer: Sequencer<{
    Mempool: typeof PrivateMempool;
    LocalTaskWorkerModule: typeof LocalTaskWorkerModule;
    BaseLayer: typeof NoopBaseLayer;
    BlockProducerModule: typeof BlockProducerModule;
    BlockTrigger: typeof ManualBlockTrigger;
  }>;

  let protocol: Protocol<{
    // AccountStateModule: typeof AccountStateModule;
    BlockProver: typeof BlockProver;
    StateTransitionProver: typeof StateTransitionProver;
  }>;

  let blockTrigger: ManualBlockTrigger;
  let mempool: PrivateMempool;

  beforeEach(async () => {
    // container.reset();

    const stateService = new InMemoryStateService();

    runtime = Runtime.from({
      modules: {
        tst,
      },

      config: {
        tst: {},
      },

      state: stateService,
    });

    sequencer = Sequencer.from({
      modules: {
        Mempool: PrivateMempool,
        LocalTaskWorkerModule,
        BaseLayer: NoopBaseLayer,
        BlockProducerModule,
        BlockTrigger: ManualBlockTrigger,
      },

      config: {
        BlockTrigger: {},
        Mempool: {},
        BlockProducerModule: {},
        LocalTaskWorkerModule: {},
        BaseLayer: {},
      },
    });

    sequencer.dependencyContainer.register<TaskQueue>("TaskQueue", {
      useValue: new LocalTaskQueue(0),
    });

    protocol = VanillaProtocol.from({  }, stateService);

    const app = AppChain.from({
      runtime,
      sequencer,
      protocol,
      modules: {},
    });

    // Start AppChain
    await app.start();

    blockTrigger = sequencer.resolve("BlockTrigger");
    mempool = sequencer.resolve("Mempool");
  });

  function createTransaction(spec: {
    privateKey: PrivateKey;
    method: [string, string];
    args: Fieldable[];
    nonce: number;
  }) {
    const methodId = runtime.dependencyContainer
      .resolve<MethodIdResolver>("MethodIdResolver")
      .getMethodId(spec.method[0], spec.method[1]);

    return new UnsignedTransaction({
      methodId: Field(methodId),
      args: spec.args.flatMap((parameter) => parameter.toFields()),
      sender: spec.privateKey.toPublicKey(),
      nonce: UInt64.from(spec.nonce),
    }).sign(spec.privateKey);
  }

  it("should produce block with two transactions, touching different states", async () => {
    // eslint-disable-next-line jest/prefer-expect-assertions
    expect.assertions(5 + 2 * 2);

    const privateKey = PrivateKey.random();
    const publicKey = privateKey.toPublicKey();

    const bob = PrivateKey.random().toPublicKey();

    const nftMetadata = Poseidon.hash(
      Encoding.stringToFields(
        JSON.stringify({
          name: "testNFT",
          uri: "...",
        })
      )
    );
    mempool.add(
      createTransaction({
        method: ["tst", "mint"],
        privateKey,
        args: [publicKey, nftMetadata],
        nonce: 0,
      })
    );

    mempool.add(
      createTransaction({
        method: ["tst", "transfer"],
        privateKey,
        args: [bob, publicKey, UInt32.from(0)],
        nonce: 1,
      })
    )

    const block = await blockTrigger.produceBlock();

    expect(block).toBeDefined();

    expect(block!.txs).toHaveLength(2);
    expect(block!.proof.proof).toBe("mock-proof");

    range(0, 2).forEach((index) => {
      expect(block!.txs[index].status).toBe(true);
      expect(block!.txs[index].statusMessage).toBe(undefined);
    });

    const stateService =
      sequencer.dependencyContainer.resolve<AsyncStateService>(
        "AsyncStateService"
      );
    // const balanceModule = runtime.resolve("tst");
    // const balancesPath = Path.fromKey(
    //   balanceModule..path!,
    //   balanceModule.balances.keyType,
    //   publicKey
    // );
    // const newState = await stateService.getAsync(balancesPath);
    //
    // expect(newState).toBeDefined();
    // expect(UInt64.fromFields(newState!)).toStrictEqual(
    //   UInt64.from(100 * numberTxs)
    // );
  }, 160_000);

  // it("should able to mint & transfer", async () => {
  //   const minterPrivateKey = PrivateKey.random();
  //   // const appChain = createAppChain(minterPrivateKey);
  //   // await appChain.start();
  //
  //   const bobPrivateKey = PrivateKey.random();
  //   const bob = bobPrivateKey.toPublicKey();
  //
  //   const minter = minterPrivateKey.toPublicKey();
  //   const nft = appChain.runtime.resolve("tst");
  //
  //   // minter mints 2 nfts
  //   const nftMetadata = Poseidon.hash(
  //     Encoding.stringToFields(
  //       JSON.stringify({
  //         name: "testNFT",
  //         uri: "...",
  //       })
  //     )
  //   );
  //   const tx1 = appChain.transaction(
  //     minter,
  //     () => {
  //       nft.mint(minter, nftMetadata); // mints to himself
  //     },
  //     { nonce: 0 }
  //   );
  //   await tx1.sign();
  //   await tx1.send();
  //
  //   // minter transfers nft1 to bob
  //   const tx2 = appChain.transaction(
  //     minter,
  //     () => {
  //       nft.transfer(bob, minter, UInt32.from(0));
  //       // nft.mint(bob, nftMetadata); // works
  //     },
  //     { nonce: 1 }
  //   );
  //   await tx2.sign();
  //   await tx2.send();
  //
  //   const block1 = await appChain.sequencer.resolveOrFail<ManualBlockTrigger>("BlockTrigger", ManualBlockTrigger).produceBlock();
  //   expect(block1?.txs[0].status).toBe(true);
  //
  //   // const block2 = await appChain.produceBlock();
  //   // expect(block2?.txs[0].status).toBe(true);
  // }, 60_000);
});