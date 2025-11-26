import {
  LinkedMerkleTree,
  MAX_FIELD,
  InMemoryMerkleTreeStorage,
} from "@proto-kit/common";
import {
  Bool,
  Field,
  PrivateKey,
  Proof,
  Signature,
  UInt64,
  VerificationKey,
} from "o1js";
import { DummyStateService } from "@proto-kit/sequencer/src/state/state/DummyStateService";

import {
  BlockHashMerkleTreeWitness,
  BlockProverPublicInput,
  BlockProverPublicOutput,
  BlockProverSingleTransactionExecutionData,
  BlockProverTransactionArguments,
  DynamicRuntimeProof,
  MethodPublicOutput,
  NetworkState,
  ProvableStateTransition,
  RuntimeTransaction,
  RuntimeVerificationKeyAttestation,
  StateTransitionProof,
  StateTransitionProver,
  StateTransitionProverPublicInput,
  StateTransitionProverPublicOutput,
  WitnessedRootWitness,
  RuntimeVerificationKeyRootService,
  AccountStateHook,
  BlockHeightHook,
  BlockProver,
  LastStateRootBlockHook,
  Protocol,
} from "../../../src";
import {
  VKTree,
  MethodVKConfigData,
} from "../../../src/prover/block/accummulators/RuntimeVerificationKeyTree";
import {
  StateTransitionProvableBatch,
  MerkleWitnessBatch,
} from "../../../src/model/StateTransitionProvableBatch";
import { AppliedStateTransitionBatchState } from "../../../src/model/AppliedStateTransitionBatch";
import { Option } from "../../../src/model/Option";

/**
 * Creates a RuntimeVerificationKeyAttestation with a mock VK tree.
 */
export async function createMockVerificationKeyAttestation(
  verificationKey: VerificationKey
) {
  const tree = new VKTree(new InMemoryMerkleTreeStorage());
  const methodId = Field(1);
  const configData = new MethodVKConfigData({
    methodId,
    vkHash: verificationKey.hash,
  });
  tree.setLeaf(BigInt(0), configData.hash());
  const witness = tree.getWitness(BigInt(0));
  return {
    attestation: new RuntimeVerificationKeyAttestation({
      verificationKey,
      witness,
    }),
    treeRoot: tree.getRoot().toBigInt(),
  };
}

/**
 * Creates a dummy state transition proof
 */
export async function createDummyStateTransitionProof(): Promise<StateTransitionProof> {
  const publicInput = new StateTransitionProverPublicInput({
    root: Field(0),
    batchesHash: Field(0),
    currentBatchStateHash: Field(0),
    witnessedRootsHash: Field(0),
  });

  const publicOutput = new StateTransitionProverPublicOutput({
    root: Field(0),
    batchesHash: Field(0),
    currentBatchStateHash: Field(0),
    witnessedRootsHash: Field(0),
  });

  return new Proof<
    StateTransitionProverPublicInput,
    StateTransitionProverPublicOutput
  >({
    publicInput,
    publicOutput,
    proof: "",
    maxProofsVerified: 2,
  });
}

/**
 * Creates a Merkle witness for block tree inclusion
 */
export function createBlockHashWitness(): {
  blockWitness: BlockHashMerkleTreeWitness;
  blockNumber: Field;
  blockHashRoot: Field;
} {
  const blockWitness = BlockHashMerkleTreeWitness.dummy();
  const calculatedIndex = blockWitness.calculateIndex();
  const calculatedRoot = blockWitness.calculateRoot(Field(0));
  return {
    blockWitness,
    blockNumber: calculatedIndex,
    blockHashRoot: calculatedRoot,
  };
}

/**
 * Creates a StateTransitionProof with computed witnessedRootsHash.
 */
export async function createStateTransitionProofWithTransitions(
  initialRoot: Field,
  stProver: StateTransitionProver
): Promise<StateTransitionProof> {
  const batchSize = 4;
  const batch = StateTransitionProvableBatch.fromBatches([
    {
      applied: Bool(true),
      witnessRoot: Bool(true),
      stateTransitions: [
        new ProvableStateTransition({
          path: Field(0),
          from: Option.fromValue(Field(0), Field).toProvable(),
          to: Option.fromValue(Field(100), Field).toProvable(),
        }),
      ],
    },
  ])[0];
  const witnesses = new MerkleWitnessBatch({
    witnesses: Array.from({ length: batchSize }, () =>
      LinkedMerkleTree.dummyWitness()
    ),
  });

  const currentAppliedBatch = new AppliedStateTransitionBatchState({
    batchHash: Field(0),
    root: Field(0),
  });

  const publicInput = new StateTransitionProverPublicInput({
    root: initialRoot,
    batchesHash: Field(0),
    currentBatchStateHash: Field(0),
    witnessedRootsHash: Field(0),
  });

  const publicOutput = await stProver.proveBatch(
    publicInput,
    batch,
    witnesses,
    currentAppliedBatch
  );
  return new Proof<
    StateTransitionProverPublicInput,
    StateTransitionProverPublicOutput
  >({
    publicInput,
    publicOutput,
    proof: "",
    maxProofsVerified: 2,
  });
}

/**
 * Creates a runtime transaction with runtime proof
 */
export function createRuntimeTransactionWithProof(options?: {
  methodId?: Field;
  argsHash?: Field;
  networkState?: NetworkState;
  isMessage?: boolean;
}): {
  runtimeTx: RuntimeTransaction;
  runtimeProof: DynamicRuntimeProof;
  privateKey: PrivateKey;
  signature: Signature;
} {
  const methodId = options?.methodId ?? Field(1);
  const argsHash = options?.argsHash ?? Field(999);
  const networkState = options?.networkState ?? NetworkState.empty();
  const privateKey = PrivateKey.random();
  const publicKey = privateKey.toPublicKey();
  const runtimeTx =
    options?.isMessage ?? false
      ? RuntimeTransaction.fromMessage({
          methodId,
          argsHash,
        })
      : RuntimeTransaction.fromTransaction({
          methodId: methodId,
          sender: publicKey,
          nonce: UInt64.from(0),
          argsHash: argsHash,
        });

  const signatureData = [
    runtimeTx.methodId,
    ...runtimeTx.nonce.value.toFields(),
    runtimeTx.argsHash,
  ];
  const signature = Signature.create(privateKey, signatureData);

  const txHash = runtimeTx.hash();
  const methodPublicOutput = new MethodPublicOutput({
    transactionHash: txHash,
    stateTransitionsHash: Field(0),
    status: Bool(true),
    networkStateHash: networkState.hash(),
    isMessage: Bool(options?.isMessage ?? false),
    eventsHash: Field(0),
  });

  const runtimeProof = new DynamicRuntimeProof({
    publicInput: undefined,
    publicOutput: methodPublicOutput,
    proof: "",
    maxProofsVerified: 0,
  });

  return { runtimeTx, runtimeProof, privateKey, signature };
}

/**
 * Creates a BlockProverPublicInput with defa configuration
 */
export function createBlockProverPublicInput(
  overrides: Partial<BlockProverPublicInput> = {}
): BlockProverPublicInput {
  const defaults = {
    stateRoot: Field(0),
    transactionsHash: Field(0),
    eternalTransactionsHash: Field(0),
    networkStateHash: NetworkState.empty().hash(),
    blockNumber: MAX_FIELD,
    pendingSTBatchesHash: Field(0),
    incomingMessagesHash: Field(0),
    witnessedRootsHash: Field(0),
    blockHashRoot: Field(0),
  };

  return new BlockProverPublicInput({
    ...defaults,
    ...overrides,
  });
}

/**
 * Sets up VK attestation and injects tree root into service
 */
export async function setupVerificationKeyAttestation(
  protocol: Protocol<{
    StateTransitionProver: typeof StateTransitionProver;
    BlockProver: typeof BlockProver;
    AccountState: typeof AccountStateHook;
    BlockHeight: typeof BlockHeightHook;
    LastStateRoot: typeof LastStateRootBlockHook;
  }>
): Promise<{
  verificationKeyAttestation: RuntimeVerificationKeyAttestation;
}> {
  const vk = await VerificationKey.dummy();
  const { attestation: verificationKeyAttestation, treeRoot } =
    await createMockVerificationKeyAttestation(vk);

  const vkService = protocol.dependencyContainer.resolve(
    RuntimeVerificationKeyRootService
  );
  vkService.setRoot(treeRoot);

  return { verificationKeyAttestation };
}

/**
 * Sets up state service for transaction execution
 */
export function setupStateService(
  protocol: Protocol<{
    StateTransitionProver: typeof StateTransitionProver;
    BlockProver: typeof BlockProver;
    AccountState: typeof AccountStateHook;
    BlockHeight: typeof BlockHeightHook;
    LastStateRoot: typeof LastStateRootBlockHook;
  }>
): DummyStateService {
  const { stateServiceProvider } = protocol;
  const dummyStateService = new DummyStateService();
  stateServiceProvider.setCurrentStateService(dummyStateService);
  return dummyStateService;
}

export const DEFAULT_TRANSACTION = {
  stateRoot: Field(0),
  transactionsHash: Field(0),
  eternalTransactionsHash: Field(0),
  networkStateHash: NetworkState.empty().hash(),
  blockNumber: MAX_FIELD,
  pendingSTBatchesHash: Field(0),
  incomingMessagesHash: Field(0),
  witnessedRootsHash: Field(0),
  blockHashRoot: Field(0),
};
/**
 * Helper function to create a transaction proof
 */
export function createTransactionProof(
  initialStateRoot: Field,
  pendingSTBatchesHash: Field,
  isEmpty: boolean = false
): Proof<BlockProverPublicInput, BlockProverPublicOutput> {
  const transactionInput = {
    ...DEFAULT_TRANSACTION,
    stateRoot: initialStateRoot,
  };

  const transactionProofPublicInput = new BlockProverPublicInput(
    transactionInput
  );
  const transactionProofOutput = isEmpty
    ? new BlockProverPublicOutput({ ...transactionInput, closed: Bool(false) })
    : new BlockProverPublicOutput({
        ...transactionInput,
        transactionsHash: Field(123),
        eternalTransactionsHash: Field(789),
        pendingSTBatchesHash: pendingSTBatchesHash,
        closed: Bool(false),
      });
  return new Proof<BlockProverPublicInput, BlockProverPublicOutput>({
    publicInput: transactionProofPublicInput,
    publicOutput: transactionProofOutput,
    maxProofsVerified: 2,
    proof: "",
  });
}

/**
 * Helper function to prove a block
 */
export async function proveBlock(
  protocol: Protocol<{
    StateTransitionProver: typeof StateTransitionProver;
    BlockProver: typeof BlockProver;
    AccountState: typeof AccountStateHook;
    BlockHeight: typeof BlockHeightHook;
    LastStateRoot: typeof LastStateRootBlockHook;
  }>,
  options?: {
    isEmptyTransition?: boolean;
    deferSTProof?: boolean;
    initialStateRoot?: Field;
    networkStateHash?: Field;
    blockWitness?: BlockHashMerkleTreeWitness;
    stProof?: StateTransitionProof;
    publicInputOverrides?: Partial<BlockProverPublicInput>;
    transactionProofOverride?: Proof<
      BlockProverPublicInput,
      BlockProverPublicOutput
    >;
  }
): Promise<BlockProverPublicOutput> {
  const initialStateRoot = options?.initialStateRoot ?? Field(0);
  const networkState = NetworkState.empty();
  const {
    blockWitness: defaultBlockWitness,
    blockNumber,
    blockHashRoot,
  } = createBlockHashWitness();
  const blockWitness = options?.blockWitness ?? defaultBlockWitness;
  const networkStateHashForInput =
    options?.networkStateHash ?? networkState.hash();

  const blockProofPublicInput = createBlockProverPublicInput({
    stateRoot: initialStateRoot,
    networkStateHash: networkStateHashForInput,
    blockNumber: blockNumber,
    blockHashRoot: blockHashRoot,
    ...(options?.publicInputOverrides ?? {}),
  });
  const stProver = protocol.resolve("StateTransitionProver");
  const stProof =
    options?.stProof ??
    (options?.isEmptyTransition ?? false
      ? await createDummyStateTransitionProof()
      : await createStateTransitionProofWithTransitions(
          initialStateRoot,
          stProver
        ));
  const transactionProof =
    options?.transactionProofOverride ??
    createTransactionProof(
      initialStateRoot,
      stProof.publicOutput.batchesHash,
      options?.isEmptyTransition
    );
  const dummyWitnessRoot = new WitnessedRootWitness({
    witnessedRoot: initialStateRoot,
    preimage: Field(0),
  });
  const blockProver = protocol.resolve("BlockProver");
  return await blockProver.proveBlock(
    blockProofPublicInput,
    networkState,
    blockWitness,
    stProof,
    Bool(options?.deferSTProof ?? false),
    dummyWitnessRoot,
    transactionProof
  );
}

/**
 * Helper function to prove a transaction
 */
export async function proveTransaction(
  protocol: Protocol<{
    StateTransitionProver: typeof StateTransitionProver;
    BlockProver: typeof BlockProver;
    AccountState: typeof AccountStateHook;
    BlockHeight: typeof BlockHeightHook;
    LastStateRoot: typeof LastStateRootBlockHook;
  }>,
  options?: {
    initialStateRoot?: Field;
    networkState?: NetworkState;
    isMessage?: boolean;
    methodId?: Field;
    argsHash?: Field;
    publicInputOverrides?: Partial<BlockProverPublicInput>;
    useInvalidVK?: boolean;
    badNetworkStateHash?: Field;
  }
): Promise<BlockProverPublicOutput> {
  const initialStateRoot = options?.initialStateRoot ?? Field(0);
  const networkState = options?.networkState ?? NetworkState.empty();
  const isMessage = options?.isMessage ?? false;
  const methodId = options?.methodId ?? Field(1);
  const argsHash = options?.argsHash ?? Field(999);

  const publicInput = createBlockProverPublicInput({
    stateRoot: initialStateRoot,
    networkStateHash: options?.badNetworkStateHash ?? networkState.hash(),
    ...(options?.publicInputOverrides ?? {}),
  });

  const { runtimeTx, runtimeProof, signature } =
    createRuntimeTransactionWithProof({
      methodId,
      argsHash,
      networkState,
      isMessage,
    });
  const { verificationKeyAttestation: vk } =
    options?.useInvalidVK ?? false
      ? {
          verificationKeyAttestation: RuntimeVerificationKeyAttestation.empty(),
        }
      : await setupVerificationKeyAttestation(protocol);

  setupStateService(protocol);

  const executionData = new BlockProverSingleTransactionExecutionData({
    transaction: new BlockProverTransactionArguments({
      transaction: runtimeTx,
      signature,
      verificationKeyAttestation: vk,
    }),
    networkState,
  });

  const blockProver = protocol.resolve("BlockProver");
  return await blockProver.proveTransaction(
    publicInput,
    runtimeProof,
    executionData
  );
}

/**
 * Helper to create a BlockProverProof
 */
export function createBlockProof(
  overrides: {
    publicInput?: Partial<BlockProverPublicInput>;
    publicOutput?: Partial<BlockProverPublicOutput>;
  } = {}
): Proof<BlockProverPublicInput, BlockProverPublicOutput> {
  const defaults = {
    stateRoot: Field(0),
    transactionsHash: Field(0),
    eternalTransactionsHash: Field(0),
    networkStateHash: NetworkState.empty().hash(),
    blockNumber: Field(0),
    pendingSTBatchesHash: Field(0),
    incomingMessagesHash: Field(0),
    witnessedRootsHash: Field(0),
    blockHashRoot: Field(0),
  };
  return new Proof<BlockProverPublicInput, BlockProverPublicOutput>({
    publicInput: new BlockProverPublicInput({
      ...defaults,
      ...overrides.publicInput,
    }),
    publicOutput: new BlockProverPublicOutput({
      ...{ ...defaults, closed: Bool(true), blockNumber: Field(1) },
      ...overrides.publicOutput,
    }),
    maxProofsVerified: 2,
    proof: "",
  });
}
