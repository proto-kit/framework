import "reflect-metadata";

import {
  AppliedBatchHashList,
  Option,
  ProtocolConstants,
  StateTransition,
  StateTransitionProver,
  WitnessedRootHashList,
} from "@proto-kit/protocol";
import { Bool, Field } from "o1js";
import { LinkedMerkleTree, mapSequential } from "@proto-kit/common";
import { toStateTransitionsHash } from "@proto-kit/module";

import {
  UntypedStateTransition,
  StateTransitionTracingService,
  TracingStateTransitionBatch,
  StateTransitionProofParameters,
  ConsoleTracer,
  CachedLinkedLeafStore,
} from "../../../src";
import { InMemoryAsyncLinkedLeafStore } from "../../../src/storage/inmemory/InMemoryAsyncLinkedLeafStore";

function createST(obj: {
  path: string;
  from: string | undefined;
  to: string | undefined;
}): UntypedStateTransition {
  const st = StateTransition.fromTo(
    Field(obj.path),
    Option.from(Bool(obj.from !== undefined), Field(obj.from ?? "0"), Field),
    Option.from(Bool(obj.to !== undefined), Field(obj.to ?? "0"), Field)
  );
  if (obj.from === undefined) {
    st.from.forceSome();
  }
  return UntypedStateTransition.fromStateTransition(st);
}

function createSTSimple(
  path: string,
  from: string | undefined,
  to: string | undefined = undefined
) {
  return createST({
    path,
    from,
    to,
  });
}

async function applyBatchesToTree(
  batches: TracingStateTransitionBatch[],
  cached: CachedLinkedLeafStore
) {
  const sts = batches
    .filter((x) => x.applied)
    .flatMap(({ stateTransitions }) => stateTransitions);

  const tree = new LinkedMerkleTree(cached.treeStore, cached);

  await mapSequential(sts, async (st) => {
    await cached.preloadKey(BigInt(st.path));

    if (st.to.isSome) {
      tree.setLeaf(BigInt(st.path), BigInt(st.to.treeValue));
    }
  });

  return tree;
}

// async function prepareContainerForFlow() {
//   const SequencerC = Sequencer.from({
//     modules: {
//       TaskQueue: LocalTaskQueue,
//       LocalTaskWorkerModule: LocalTaskWorkerModule.from({
//         StateTransitionTask,
//         StateTransitionReductionTask,
//       }),
//     },
//   });
//
//   const c = container.createChildContainer();
//
//   c.register("Protocol", {
//     useFactory: () => {
//       const protocol = new (Protocol.from({
//         modules: VanillaProtocolModules.mandatoryModules({}),
//       }))();
//       protocol.configure({
//         ...VanillaProtocolModules.mandatoryConfig(),
//       });
//       protocol.create(() => c.createChildContainer());
//
//       return protocol;
//     },
//   });
//   c.register("AreProofsEnabled", {
//     useClass: InMemoryAreProofsEnabled,
//   });
//
//   const sequencer = new SequencerC();
//   sequencer.configure({
//     LocalTaskWorkerModule: {
//       StateTransitionTask: {},
//       StateTransitionReductionTask: {},
//     },
//     TaskQueue: {},
//   });
//   sequencer.create(() => c.createChildContainer());
//   await sequencer.start();
//
//   return sequencer;
// }

const service = new StateTransitionTracingService(new ConsoleTracer());

describe("StateTransitionTracingService", () => {
  const cases: {
    batch: TracingStateTransitionBatch[];
    numSTs: number;
  }[] = [
    {
      batch: [
        {
          witnessRoot: false,
          applied: true,
          stateTransitions: [createSTSimple("1", undefined, "1")],
        },
        {
          witnessRoot: true,
          applied: true,
          stateTransitions: [createSTSimple("100", undefined, "100")],
        },
        {
          witnessRoot: false,
          applied: false,
          stateTransitions: [],
        },
        {
          witnessRoot: true,
          applied: true,
          stateTransitions: [
            createSTSimple("2", undefined, "2"),
            createSTSimple("3", undefined, "3"),
          ],
        },
        {
          witnessRoot: false,
          applied: true,
          stateTransitions: [createSTSimple("2", "2", "4")],
        },
      ],
      numSTs: 5,
    },
  ];

  describe.each(cases)("root accumulator", ({ batch, numSTs }) => {
    it("should match", () => {});
  });

  describe.each(cases)("tracing two chunks of STs", ({ batch, numSTs }) => {
    const store = new InMemoryAsyncLinkedLeafStore();

    let trace: StateTransitionProofParameters[];

    beforeAll(async () => {
      const cached = await CachedLinkedLeafStore.new(store);

      trace = await service.createMerkleTrace(cached, batch);
    });

    it("trace should have correct length", async () => {
      expect(trace).toHaveLength(
        Math.ceil(numSTs / ProtocolConstants.stateTransitionProverBatchSize)
      );
    });

    it("should set second publicInput correctly", async () => {
      const tree = await applyBatchesToTree(
        batch.slice(0, 4),
        await CachedLinkedLeafStore.new(store)
      );

      expect(trace[1].publicInput.root.toString()).toStrictEqual(
        tree.getRoot().toString()
      );

      const batchList = new AppliedBatchHashList();
      batchList.push({
        batchHash: toStateTransitionsHash(batch[0].stateTransitions),
        applied: Bool(true),
      });
      batchList.push({
        batchHash: toStateTransitionsHash(batch[1].stateTransitions),
        applied: Bool(true),
      });

      const tempBatchListHash = batchList.commitment;

      batchList.push({
        batchHash: toStateTransitionsHash(batch[2].stateTransitions),
        applied: Bool(true),
      });
      batchList.push({
        batchHash: toStateTransitionsHash(batch[3].stateTransitions),
        applied: Bool(true),
      });

      expect(trace[1].publicInput.batchesHash.toString()).toStrictEqual(
        batchList.commitment.toString()
      );

      const witnessedRootsList = new WitnessedRootHashList();
      const tempTree = await applyBatchesToTree(
        batch.slice(0, 2),
        await CachedLinkedLeafStore.new(store)
      );

      witnessedRootsList.push({
        root: tempTree.getRoot(),
        appliedBatchListState: tempBatchListHash,
      });
      witnessedRootsList.push({
        root: tree.getRoot(),
        appliedBatchListState: batchList.commitment,
      });

      expect(trace[1].publicInput.witnessedRootsHash.toString()).toStrictEqual(
        witnessedRootsList.commitment.toString()
      );
    });
  });

  describe("tracing two separate sequences", () => {
    const store = new InMemoryAsyncLinkedLeafStore();
    let cached: CachedLinkedLeafStore;

    let trace1: StateTransitionProofParameters[];
    let trace2: StateTransitionProofParameters[];
    let tree1: LinkedMerkleTree;

    const batches: TracingStateTransitionBatch[][] = [
      [
        {
          witnessRoot: false,
          applied: true,
          stateTransitions: [createSTSimple("1", undefined, "1")],
        },
        {
          witnessRoot: true,
          applied: true,
          stateTransitions: [createSTSimple("100", undefined, "100")],
        },
      ],
      [
        {
          witnessRoot: false,
          applied: true,
          stateTransitions: [createSTSimple("1", "1", "2")],
        },
      ],
    ];

    beforeAll(async () => {
      cached = await CachedLinkedLeafStore.new(store);
      trace1 = await service.createMerkleTrace(cached, batches[0]);

      const cached2 = await CachedLinkedLeafStore.new(store);
      tree1 = await applyBatchesToTree(batches[0], cached2);

      trace2 = await service.createMerkleTrace(cached, batches[1]);
    });

    it("check rootAccumulator is zero", () => {
      expect(trace1[0].publicInput.witnessedRootsHash.toString()).toBe("0");
      expect(trace2[0].publicInput.witnessedRootsHash.toString()).toBe("0");
    });

    it("check currentBatchHash is zero", () => {
      expect(trace1[0].publicInput.currentBatchStateHash.toString()).toBe("0");
      expect(trace2[0].publicInput.currentBatchStateHash.toString()).toBe("0");
    });

    it("check batchesHash is zero", () => {
      expect(trace1[0].publicInput.batchesHash.toString()).toBe("0");
      expect(trace2[0].publicInput.batchesHash.toString()).toBe("0");
    });

    it("check matching PI root", async () => {
      expect(tree1.getRoot().toString()).toStrictEqual(
        trace2[0].publicInput.root.toString()
      );
    });
  });

  describe("should trace correctly", () => {
    const store = new InMemoryAsyncLinkedLeafStore();
    let cached: CachedLinkedLeafStore;

    const batches: TracingStateTransitionBatch[] = [
      {
        witnessRoot: false,
        applied: true,
        stateTransitions: [createSTSimple("1", undefined, "1")],
      },
      {
        witnessRoot: true,
        applied: true,
        stateTransitions: [createSTSimple("100", undefined, "100")],
      },
      {
        witnessRoot: false,
        applied: true,
        stateTransitions: [createSTSimple("100", "100", "200")],
      },
    ];

    let trace: StateTransitionProofParameters[];

    beforeAll(async () => {
      cached = await CachedLinkedLeafStore.new(store);
      trace = await service.createMerkleTrace(cached, batches);
    });

    it("check trace well-formed", () => {
      expect(trace).toHaveLength(1);

      batches.forEach(({ witnessRoot }, index) => {
        expect(
          trace[
            Math.floor(index / ProtocolConstants.stateTransitionProverBatchSize)
          ].batch.batch[index].witnessRoot.toBoolean()
        ).toBe(witnessRoot);
      });
    });

    it("check if batch is provable", async () => {
      const prover = new StateTransitionProver().zkProgrammable;

      await mapSequential(trace, async (batch) => {
        const result = await prover.proveBatch(
          batch.publicInput,
          batch.batch,
          { witnesses: batch.merkleWitnesses },
          batch.batchState
        );

        expect(result).toBeDefined();

        // Check that root matches
        const tree = new LinkedMerkleTree(cached.treeStore, cached);
        expect(result.root.toString()).toStrictEqual(tree.getRoot().toString());
      });
    });

    it("check that STs have been applied to the tree store", async () => {
      const tracedTree = new LinkedMerkleTree(cached.treeStore, cached);

      const cached2 = await CachedLinkedLeafStore.new(store);
      const tree = await applyBatchesToTree(batches, cached2);

      expect(tracedTree.getRoot().toString()).toStrictEqual(
        tree.getRoot().toString()
      );
    });
  });
});
