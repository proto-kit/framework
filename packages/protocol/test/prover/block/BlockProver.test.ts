/* eslint-disable max-len */
/**
 * Testing strategy:
 *
 * - Test that hooks are executed and batches are created correctly
 *    - Transaction
 *    - Block
 * - Test the various static checks on the transaction (signature, verificationKey, network state hash)
 * - Test correct construction of the batch and list commitments
 * - Test correct integration of the STProof - both defer and notDefer
 * - proveBlock: correct blockNumber progression, closed flag (doesn't accepts closed proofs as tx proofs)
 */

/* eslint-enable max-len */
import { MAX_FIELD } from "@proto-kit/common";
import {
  Bool,
  Field,
  Proof,
  Signature,
  UInt64,
} from "o1js";
import "reflect-metadata";

import {
  BlockProverMultiTransactionExecutionData,
  BlockProverPublicInput,
  BlockProverPublicOutput,
  BlockProverSingleTransactionExecutionData,
  BlockProverTransactionArguments,
  NetworkState,
  RuntimeTransaction,
  StateTransitionProverPublicInput,
  StateTransitionProverPublicOutput,
} from "../../../src";

import { createAndInitTestingProtocol } from "../../TestingProtocol";
import { createBlockProverPublicInput, createDummyStateTransitionProof, createRuntimeTransactionWithProof, createStateTransitionProofWithTransitions, proveBlock, proveTransaction, setupStateService, setupVerificationKeyAttestation } from "./utils";

describe("BlockProver", () => {
  const protocol = createAndInitTestingProtocol();
  describe("Block Proving", () => {
    it("should prove a block", async () => {
      const blockProofPublicOutput = await proveBlock(protocol);
      expect(blockProofPublicOutput).toBeDefined();
      expect(blockProofPublicOutput.closed.toBoolean()).toBe(true);
      expect(blockProofPublicOutput.blockNumber).toEqual(Field(1));
    });

    it("should prove a block with no transaction", async () => {
      const blockProofPublicOutput = await proveBlock(protocol, {
        isEmptyTransition: true,
      });
      expect(blockProofPublicOutput).toBeDefined();
      expect(blockProofPublicOutput.closed.toBoolean()).toBe(true);
      expect(blockProofPublicOutput.blockNumber).toEqual(Field(1));
    });

    it("should defer state transitions in block proving", async () => {
      const blockProofPublicOutput = await proveBlock(protocol, {
        deferSTProof: true,
      });
      expect(blockProofPublicOutput).toBeDefined();
      expect(blockProofPublicOutput.closed.toBoolean()).toBe(true);
      expect(blockProofPublicOutput.blockNumber).toEqual(Field(1));
      expect(blockProofPublicOutput.witnessedRootsHash).not.toEqual(Field(0));
      expect(blockProofPublicOutput.pendingSTBatchesHash).not.toEqual(Field(0));
    });

    describe("Assertion Failures", () => {
      it("should fail when transactionsHash does not start from 0", async () => {
        const errorMsg = `Transactionshash has to start at 0`;
        await expect(async () => {
          await proveBlock(protocol, {
            publicInputOverrides: { transactionsHash: Field(123) },
          });
        }).rejects.toThrow(errorMsg);
      });

      it("should fail when transaction proof blockHashRoot (publicInput) is not empty", async () => {
        const errorMsg = `TransactionProof cannot carry the blockHashRoot - publicInput`;

        const initialStateRoot = Field(0);
        const networkState = NetworkState.empty();
        const stProof = await createDummyStateTransitionProof();

        const badTransactionProof = new Proof<
          BlockProverPublicInput,
          BlockProverPublicOutput
        >({
          publicInput: new BlockProverPublicInput({
            stateRoot: initialStateRoot,
            transactionsHash: Field(0),
            eternalTransactionsHash: Field(0),
            networkStateHash: networkState.hash(),
            blockNumber: MAX_FIELD,
            pendingSTBatchesHash: Field(0),
            incomingMessagesHash: Field(0),
            witnessedRootsHash: Field(0),
            blockHashRoot: Field(123),
          }),
          publicOutput: new BlockProverPublicOutput({
            stateRoot: initialStateRoot,
            transactionsHash: Field(0),
            eternalTransactionsHash: Field(0),
            networkStateHash: networkState.hash(),
            blockNumber: MAX_FIELD,
            pendingSTBatchesHash: Field(0),
            incomingMessagesHash: Field(0),
            witnessedRootsHash: Field(0),
            blockHashRoot: Field(0),
            closed: Bool(false),
          }),
          maxProofsVerified: 2,
          proof: "",
        });

        await expect(async () => {
          await proveBlock(protocol, {
            stProof,
            transactionProofOverride: badTransactionProof,
          });
        }).rejects.toThrow(errorMsg);
      });

      it("should fail when blockHashRoot is not empty", async () => {
        const errorMsg = `TransactionProof cannot carry the blockHashRoot - publicOutput`;

        const initialStateRoot = Field(0);
        const networkState = NetworkState.empty();
        const stProof = await createDummyStateTransitionProof();

        const badTransactionProof = new Proof<
          BlockProverPublicInput,
          BlockProverPublicOutput
        >({
          publicInput: new BlockProverPublicInput({
            stateRoot: initialStateRoot,
            transactionsHash: Field(0),
            eternalTransactionsHash: Field(0),
            networkStateHash: networkState.hash(),
            blockNumber: MAX_FIELD,
            pendingSTBatchesHash: Field(0),
            incomingMessagesHash: Field(0),
            witnessedRootsHash: Field(0),
            blockHashRoot: Field(0),
          }),
          publicOutput: new BlockProverPublicOutput({
            stateRoot: initialStateRoot,
            transactionsHash: Field(0),
            eternalTransactionsHash: Field(0),
            networkStateHash: networkState.hash(),
            blockNumber: MAX_FIELD,
            pendingSTBatchesHash: Field(0),
            incomingMessagesHash: Field(0),
            witnessedRootsHash: Field(0),
            blockHashRoot: Field(456),
            closed: Bool(false),
          }),
          maxProofsVerified: 2,
          proof: "",
        });

        await expect(async () => {
          await proveBlock(protocol, {
            stProof,
            transactionProofOverride: badTransactionProof,
          });
        }).rejects.toThrow(errorMsg);
      });

      it("should fail when transaction proof alter the network state", async () => {
        const errorMsg = `TransactionProof cannot alter the network state`;

        const initialStateRoot = Field(0);
        const networkState = NetworkState.empty();
        const badNetworkState = new NetworkState({
          block: { height: UInt64.from(1) },
          previous: { rootHash: Field(1) },
        });

        const stProof = await createDummyStateTransitionProof();

        const badTransactionProof = new Proof<
          BlockProverPublicInput,
          BlockProverPublicOutput
        >({
          publicInput: new BlockProverPublicInput({
            stateRoot: initialStateRoot,
            transactionsHash: Field(0),
            eternalTransactionsHash: Field(0),
            networkStateHash: networkState.hash(),
            blockNumber: MAX_FIELD,
            pendingSTBatchesHash: Field(0),
            incomingMessagesHash: Field(0),
            witnessedRootsHash: Field(0),
            blockHashRoot: Field(0),
          }),
          publicOutput: new BlockProverPublicOutput({
            stateRoot: initialStateRoot,
            transactionsHash: Field(0),
            eternalTransactionsHash: Field(0),
            networkStateHash: badNetworkState.hash(),
            blockNumber: MAX_FIELD,
            pendingSTBatchesHash: Field(0),
            incomingMessagesHash: Field(0),
            witnessedRootsHash: Field(0),
            blockHashRoot: Field(0),
            closed: Bool(false),
          }),
          maxProofsVerified: 2,
          proof: "",
        });

        await expect(async () => {
          await proveBlock(protocol, {
            stProof,
            transactionProofOverride: badTransactionProof,
          });
        }).rejects.toThrow(errorMsg);
      });

      it("should fail when networkStateHash mismatches in proveBlock", async () => {
        const errorMsg = `ExecutionData Networkstate doesn't equal public input hash`;
        const badNetworkStateHash = new NetworkState({
          block: { height: UInt64.from(1) },
          previous: { rootHash: Field(1) },
        }).hash();

        await expect(async () => {
          await proveBlock(protocol, {
            networkStateHash: badNetworkStateHash,
          });
        }).rejects.toThrow(errorMsg);
      });

      it("should fail when transaction proof networkStateHash does not match beforeBlock hook result", async () => {
        const errorMsg = `TransactionProof networkstate hash not matching beforeBlock hook result`;

        const initialStateRoot = Field(0);
        const networkState = NetworkState.empty();
        const stProof = await createDummyStateTransitionProof();

        // Create a transaction proof with mismatched networkStateHash
        // This should not match the beforeBlock hook result
        const badNetworkState = new NetworkState({
          block: { height: UInt64.from(1) },
          previous: { rootHash: Field(1) },
        });

        const badTransactionProof = new Proof<
          BlockProverPublicInput,
          BlockProverPublicOutput
        >({
          publicInput: new BlockProverPublicInput({
            stateRoot: initialStateRoot,
            transactionsHash: Field(0),
            eternalTransactionsHash: Field(0),
            networkStateHash: badNetworkState.hash(),
            blockNumber: MAX_FIELD,
            pendingSTBatchesHash: Field(0),
            incomingMessagesHash: Field(0),
            witnessedRootsHash: Field(0),
            blockHashRoot: Field(0),
          }),
          publicOutput: new BlockProverPublicOutput({
            stateRoot: initialStateRoot,
            transactionsHash: Field(0),
            eternalTransactionsHash: Field(123),
            networkStateHash: badNetworkState.hash(),
            blockNumber: MAX_FIELD,
            pendingSTBatchesHash: Field(0),
            incomingMessagesHash: Field(0),
            witnessedRootsHash: Field(0),
            blockHashRoot: Field(0),
            closed: Bool(false),
          }),
          maxProofsVerified: 2,
          proof: "",
        });

        await expect(async () => {
          await proveBlock(protocol, {
            stProof,
            transactionProofOverride: badTransactionProof,
            networkStateHash: networkState.hash(),
          });
        }).rejects.toThrow(errorMsg);
      });

      it("should fail when transaction proof changes the state root", async () => {
        const errorMsg = `TransactionProofs can't change the state root`;

        const initialStateRoot = Field(0);
        const networkState = NetworkState.empty();
        const stProof = await createDummyStateTransitionProof();

        const badTransactionProof = new Proof<
          BlockProverPublicInput,
          BlockProverPublicOutput
        >({
          publicInput: new BlockProverPublicInput({
            stateRoot: initialStateRoot,
            transactionsHash: Field(0),
            eternalTransactionsHash: Field(0),
            networkStateHash: networkState.hash(),
            blockNumber: MAX_FIELD,
            pendingSTBatchesHash: Field(0),
            incomingMessagesHash: Field(0),
            witnessedRootsHash: Field(0),
            blockHashRoot: Field(0),
          }),
          publicOutput: new BlockProverPublicOutput({
            stateRoot: Field(999),
            transactionsHash: Field(0),
            eternalTransactionsHash: Field(0),
            networkStateHash: networkState.hash(),
            blockNumber: MAX_FIELD,
            pendingSTBatchesHash: Field(0),
            incomingMessagesHash: Field(0),
            witnessedRootsHash: Field(0),
            blockHashRoot: Field(0),
            closed: Bool(false),
          }),
          maxProofsVerified: 2,
          proof: "",
        });

        await expect(async () => {
          await proveBlock(protocol, {
            stProof,
            transactionProofOverride: badTransactionProof,
          });
        }).rejects.toThrow(errorMsg);
      });

      it("should fail when transaction proof does not start STs after beforeBlock hook", async () => {
        const errorMsg = `Transaction proof doesn't start their STs after the beforeBlockHook`;

        const initialStateRoot = Field(0);
        const networkState = NetworkState.empty();
        const stProof = await createStateTransitionProofWithTransitions(
          initialStateRoot,
          protocol.resolve("StateTransitionProver")
        );

        // Create a transaction proof with incorrect pendingSTBatchesHash
        // It should match the state after beforeBlock hook, not before
        const badTransactionProof = new Proof<
          BlockProverPublicInput,
          BlockProverPublicOutput
        >({
          publicInput: new BlockProverPublicInput({
            stateRoot: initialStateRoot,
            transactionsHash: Field(0),
            eternalTransactionsHash: Field(0),
            networkStateHash: networkState.hash(),
            blockNumber: MAX_FIELD,
            pendingSTBatchesHash: Field(999),
            incomingMessagesHash: Field(0),
            witnessedRootsHash: Field(0),
            blockHashRoot: Field(0),
          }),
          publicOutput: new BlockProverPublicOutput({
            stateRoot: initialStateRoot,
            transactionsHash: Field(123),
            eternalTransactionsHash: Field(789),
            networkStateHash: networkState.hash(),
            blockNumber: MAX_FIELD,
            pendingSTBatchesHash: stProof.publicOutput.batchesHash,
            incomingMessagesHash: Field(0),
            witnessedRootsHash: Field(0),
            blockHashRoot: Field(0),
            closed: Bool(false),
          }),
          maxProofsVerified: 2,
          proof: "",
        });

        await expect(async () => {
          await proveBlock(protocol, {
            stProof,
            transactionProofOverride: badTransactionProof,
          });
        }).rejects.toThrow(errorMsg);
      });

      it("should fail when state root does not match witnessed root with empty state transitions", async () => {
        await expect(async () => {
          await proveBlock(protocol, {
            isEmptyTransition: true,
            publicInputOverrides: {
              stateRoot: Field(999),
            },
          });
        }).rejects.toThrow();
      });
      it("should fail when block number does not match block witnessed root", async () => {
        await expect(async () => {
          await proveBlock(protocol, {
            isEmptyTransition: true,
            publicInputOverrides: {
              blockNumber: Field(999),
            },
          });
        }).rejects.toThrow();
      });
      it("should fail when block hash does not match block witness", async () => {
        const errorMsg = "Supplied block hash witness not matching state root";
        await expect(async () => {
          await proveBlock(protocol, {
            publicInputOverrides: {
              blockHashRoot: Field(999),
            },
          });
        }).rejects.toThrow(errorMsg);
      });

      it("should fail when state transition proof currentBatchStateHash is not empty at start", async () => {
        const errorMsg = "State for STProof has to be empty at the start";
        const initialStateRoot = Field(0);
        const networkState = NetworkState.empty();
        const badSTProof = new Proof<
          StateTransitionProverPublicInput,
          StateTransitionProverPublicOutput
        >({
          publicInput: new StateTransitionProverPublicInput({
            root: initialStateRoot,
            batchesHash: Field(0),
            currentBatchStateHash: Field(999),
            witnessedRootsHash: Field(0),
          }),
          publicOutput: new StateTransitionProverPublicOutput({
            root: initialStateRoot,
            batchesHash: Field(0),
            currentBatchStateHash: Field(0),
            witnessedRootsHash: Field(0),
          }),
          proof: "",
          maxProofsVerified: 2,
        });
        const transactionProof = new Proof<
          BlockProverPublicInput,
          BlockProverPublicOutput
        >({
          publicInput: new BlockProverPublicInput({
            stateRoot: initialStateRoot,
            transactionsHash: Field(0),
            eternalTransactionsHash: Field(0),
            networkStateHash: networkState.hash(),
            blockNumber: MAX_FIELD,
            pendingSTBatchesHash: Field(999),
            incomingMessagesHash: Field(0),
            witnessedRootsHash: Field(0),
            blockHashRoot: Field(0),
          }),
          publicOutput: new BlockProverPublicOutput({
            stateRoot: initialStateRoot,
            transactionsHash: Field(123),
            eternalTransactionsHash: Field(789),
            networkStateHash: networkState.hash(),
            blockNumber: MAX_FIELD,
            pendingSTBatchesHash: Field(999),
            incomingMessagesHash: Field(0),
            witnessedRootsHash: Field(0),
            blockHashRoot: Field(0),
            closed: Bool(false),
          }),
          maxProofsVerified: 2,
          proof: "",
        });

        await expect(async () => {
          await proveBlock(protocol, {
            stProof: badSTProof,
            transactionProofOverride: transactionProof,
            publicInputOverrides: {
              pendingSTBatchesHash: Field(999),
            },
          });
        }).rejects.toThrow(errorMsg);
      });

      it("should fail when state transition proof currentBatchStateHash is not empty at end", async () => {
        const errorMsg = "State for STProof has to be empty at the end";
        const initialStateRoot = Field(0);
        const networkState = NetworkState.empty();
        const badSTProof = new Proof<
          StateTransitionProverPublicInput,
          StateTransitionProverPublicOutput
        >({
          publicInput: new StateTransitionProverPublicInput({
            root: initialStateRoot,
            batchesHash: Field(0),
            currentBatchStateHash: Field(0),
            witnessedRootsHash: Field(0),
          }),
          publicOutput: new StateTransitionProverPublicOutput({
            root: initialStateRoot,
            batchesHash: Field(0),
            currentBatchStateHash: Field(999),
            witnessedRootsHash: Field(0),
          }),
          proof: "",
          maxProofsVerified: 2,
        });
        const transactionProof = new Proof<
          BlockProverPublicInput,
          BlockProverPublicOutput
        >({
          publicInput: new BlockProverPublicInput({
            stateRoot: initialStateRoot,
            transactionsHash: Field(0),
            eternalTransactionsHash: Field(0),
            networkStateHash: networkState.hash(),
            blockNumber: MAX_FIELD,
            pendingSTBatchesHash: Field(999),
            incomingMessagesHash: Field(0),
            witnessedRootsHash: Field(0),
            blockHashRoot: Field(0),
          }),
          publicOutput: new BlockProverPublicOutput({
            stateRoot: initialStateRoot,
            transactionsHash: Field(123),
            eternalTransactionsHash: Field(789),
            networkStateHash: networkState.hash(),
            blockNumber: MAX_FIELD,
            pendingSTBatchesHash: Field(999),
            incomingMessagesHash: Field(0),
            witnessedRootsHash: Field(0),
            blockHashRoot: Field(0),
            closed: Bool(false),
          }),
          maxProofsVerified: 2,
          proof: "",
        });
        await expect(async () => {
          await proveBlock(protocol, {
            stProof: badSTProof,
            transactionProofOverride: transactionProof,
            publicInputOverrides: { pendingSTBatchesHash: Field(999) },
          });
        }).rejects.toThrow(errorMsg);
      });

      it("should fail when state transition proof batchesHash does not start at 0", async () => {
        const errorMsg = "Batcheshash doesn't start at 0";
        const initialStateRoot = Field(0);

        const badSTProof = new Proof<
          StateTransitionProverPublicInput,
          StateTransitionProverPublicOutput
        >({
          publicInput: new StateTransitionProverPublicInput({
            root: initialStateRoot,
            batchesHash: Field(123),
            currentBatchStateHash: Field(0),
            witnessedRootsHash: Field(0),
          }),
          publicOutput: new StateTransitionProverPublicOutput({
            root: initialStateRoot,
            batchesHash: Field(456),
            currentBatchStateHash: Field(0),
            witnessedRootsHash: Field(0),
          }),
          proof: "",
          maxProofsVerified: 2,
        });

        await expect(async () => {
          await proveBlock(protocol, {
            stProof: badSTProof,
          });
        }).rejects.toThrow(errorMsg);
      });

      it("should fail when state transition proof input root does not match state root", async () => {
        const errorMsg = "from state root not matching";
        const initialStateRoot = Field(0);
        const badStateRoot = Field(999);
        const networkState = NetworkState.empty();

        const badSTProof = new Proof<
          StateTransitionProverPublicInput,
          StateTransitionProverPublicOutput
        >({
          publicInput: new StateTransitionProverPublicInput({
            root: badStateRoot,
            batchesHash: Field(0),
            currentBatchStateHash: Field(0),
            witnessedRootsHash: Field(0),
          }),
          publicOutput: new StateTransitionProverPublicOutput({
            root: initialStateRoot,
            batchesHash: Field(0),
            currentBatchStateHash: Field(0),
            witnessedRootsHash: Field(0),
          }),
          proof: "",
          maxProofsVerified: 2,
        });
        const transactionProof = new Proof<
          BlockProverPublicInput,
          BlockProverPublicOutput
        >({
          publicInput: new BlockProverPublicInput({
            stateRoot: initialStateRoot,
            transactionsHash: Field(0),
            eternalTransactionsHash: Field(0),
            networkStateHash: networkState.hash(),
            blockNumber: MAX_FIELD,
            pendingSTBatchesHash: Field(999),
            incomingMessagesHash: Field(0),
            witnessedRootsHash: Field(0),
            blockHashRoot: Field(0),
          }),
          publicOutput: new BlockProverPublicOutput({
            stateRoot: initialStateRoot,
            transactionsHash: Field(123),
            eternalTransactionsHash: Field(789),
            networkStateHash: networkState.hash(),
            blockNumber: MAX_FIELD,
            pendingSTBatchesHash: Field(999),
            incomingMessagesHash: Field(0),
            witnessedRootsHash: Field(0),
            blockHashRoot: Field(0),
            closed: Bool(false),
          }),
          maxProofsVerified: 2,
          proof: "",
        });
        await expect(async () => {
          await proveBlock(protocol, {
            stProof: badSTProof,
            publicInputOverrides: {
              stateRoot: initialStateRoot,
              pendingSTBatchesHash: Field(999),
            },
            transactionProofOverride: transactionProof,
          });
        }).rejects.toThrow(errorMsg);
      });
    });
  });
  describe("Transaction Proving", () => {
    it("should prove a single transaction", async () => {
      const initialStateRoot = Field(0);
      const networkState = NetworkState.empty();

      const result = await proveTransaction(protocol, {
        initialStateRoot,
        networkState,
        isMessage: false,
      });

      expect(result).toBeDefined();
      expect(result.networkStateHash.value).toEqual(networkState.hash().value);
      expect(result.stateRoot.value).toEqual(initialStateRoot.value);
      expect(result.blockNumber.value).toEqual(MAX_FIELD.value);
      expect(result.closed.toBoolean()).toEqual(false);
      expect(result.witnessedRootsHash.value).toEqual(Field(0).value);
      expect(result.incomingMessagesHash.value).toEqual(Field(0).value);
      expect(result.eternalTransactionsHash.value).not.toEqual(Field(0).value);
      expect(result.transactionsHash.value).not.toEqual(Field(0).value);
      expect(result.pendingSTBatchesHash.value).not.toEqual(Field(0).value);
    });
    it("should prove a message with empty signature", async () => {
      const initialStateRoot = Field(0);
      const networkState = NetworkState.empty();

      const result = await proveTransaction(protocol, {
        initialStateRoot,
        networkState,
        isMessage: true,
      });

      expect(result).toBeDefined();
      expect(result.networkStateHash.value).toEqual(networkState.hash().value);
      expect(result.stateRoot.value).toEqual(initialStateRoot.value);
      expect(result.blockNumber.value).toEqual(MAX_FIELD.value);
      expect(result.closed.toBoolean()).toEqual(false);
      expect(result.witnessedRootsHash.value).toEqual(Field(0).value);
      expect(result.incomingMessagesHash.value).not.toEqual(Field(0).value);
      expect(result.eternalTransactionsHash.value).not.toEqual(Field(0).value);
      expect(result.transactionsHash.value).toEqual(Field(0).value);
      expect(result.pendingSTBatchesHash.value).not.toEqual(Field(0).value);
    });

    describe("Assertion Failures", () => {
      it("Should fail due to Networkstate mismatch", async () => {
        const initialStateRoot = Field(0);
        const networkState = NetworkState.empty();
        const badNetworkStateHash = new NetworkState({
          block: { height: UInt64.from(1) },
          previous: { rootHash: Field(1) },
        }).hash();

        await expect(async () => {
          await proveTransaction(protocol, {
            initialStateRoot,
            networkState,
            badNetworkStateHash,
          });
        }).rejects.toThrow(
          "ExecutionData Networkstate doesn't equal public input hash"
        );
      });
      it("Should fail due to blockNumber not equal max_field ", async () => {
        const initialStateRoot = Field(0);
        const networkState = NetworkState.empty();

        await expect(async () => {
          await proveTransaction(protocol, {
            initialStateRoot,
            networkState,
            publicInputOverrides: { blockNumber: MAX_FIELD.sub(1) },
          });
        }).rejects.toThrow("blockNumber has to be MAX for transaction proofs");
      });

      it("should fail when verification key root hash is invalid", async () => {
        const errorMsg =
          "Root hash of the provided zkProgram config witness is invalid";

        const initialStateRoot = Field(0);
        const networkState = NetworkState.empty();

        await expect(async () => {
          await proveTransaction(protocol, {
            initialStateRoot,
            networkState,
            isMessage: false,
            useInvalidVK: true,
          });
        }).rejects.toThrow(errorMsg);
      });

      it("should fail when transaction hash does not match runtime proof hash", async () => {
        const errorMsg =
          "Transactions provided in AppProof and BlockProof do not match";

        const initialStateRoot = Field(0);
        const networkState = NetworkState.empty();
        const methodId = Field(1);
        const argsHash = Field(999);

        const { runtimeProof, signature } = createRuntimeTransactionWithProof();

        const { verificationKeyAttestation: vk } =
          await setupVerificationKeyAttestation(protocol);

        setupStateService(protocol);

        // Create execution data with a different transaction (different argsHash)
        const badTransaction = RuntimeTransaction.fromMessage({
          methodId,
          argsHash: Field(888), // Different argsHash causes different hash
        });

        const publicInput = createBlockProverPublicInput({
          stateRoot: initialStateRoot,
          networkStateHash: networkState.hash(),
        });

        const executionData = new BlockProverSingleTransactionExecutionData({
          transaction: new BlockProverTransactionArguments({
            transaction: badTransaction,
            signature,
            verificationKeyAttestation: vk,
          }),
          networkState,
        });

        const blockProver = protocol.resolve("BlockProver");
        await expect(async () => {
          await blockProver.proveTransaction(
            publicInput,
            runtimeProof,
            executionData
          );
        }).rejects.toThrow(errorMsg);
      });

      it("should fail when transaction signature is invalid", async () => {
        const errorMsg = "Transaction signature not valid";

        const initialStateRoot = Field(0);
        const networkState = NetworkState.empty();

        const {
          runtimeTx,
          runtimeProof,
          signature: validSignature,
        } = createRuntimeTransactionWithProof();

        const { verificationKeyAttestation: vk } =
          await setupVerificationKeyAttestation(protocol);

        setupStateService(protocol);

        // Create a bad signature
        const badSignature = Signature.empty();

        const publicInput = createBlockProverPublicInput({
          stateRoot: initialStateRoot,
          networkStateHash: networkState.hash(),
        });

        const executionData = new BlockProverSingleTransactionExecutionData({
          transaction: new BlockProverTransactionArguments({
            transaction: runtimeTx,
            signature: badSignature,
            verificationKeyAttestation: vk,
          }),
          networkState,
        });

        const blockProver = protocol.resolve("BlockProver");
        await expect(async () => {
          await blockProver.proveTransaction(
            publicInput,
            runtimeProof,
            executionData
          );
        }).rejects.toThrow(errorMsg);
      });
    });

    it("should prove two consecutive transactions correctly", async () => {
      setupStateService(protocol);

      const initialStateRoot = Field(0);
      const networkState = NetworkState.empty();

      const publicInput = createBlockProverPublicInput({
        stateRoot: initialStateRoot,
        networkStateHash: networkState.hash(),
      });

      const {
        runtimeTx: runtimeMsg1,
        runtimeProof: runtimeProof1,
        signature: signature1,
      } = createRuntimeTransactionWithProof();

      const {
        runtimeTx: runtimeMsg2,
        runtimeProof: runtimeProof2,
        signature: signature2,
      } = createRuntimeTransactionWithProof({ argsHash: Field(888) });

      const { verificationKeyAttestation } =
        await setupVerificationKeyAttestation(protocol);
      setupStateService(protocol);

      const executionData = new BlockProverMultiTransactionExecutionData({
        transaction1: new BlockProverTransactionArguments({
          transaction: runtimeMsg1,
          verificationKeyAttestation,
          signature: signature1,
        }),
        transaction2: new BlockProverTransactionArguments({
          transaction: runtimeMsg2,
          verificationKeyAttestation,
          signature: signature2,
        }),
        networkState,
      });

      const blockProver = protocol.resolve("BlockProver");
      const result = await blockProver.proveTransactions(
        publicInput,
        runtimeProof1,
        runtimeProof2,
        executionData
      );

      expect(result).toBeDefined();
      expect(result.networkStateHash.value).toEqual(networkState.hash().value);
      expect(result.stateRoot.value).toEqual(initialStateRoot.value);
      expect(result.blockNumber.value).toEqual(publicInput.blockNumber.value);
      expect(result.closed.toBoolean()).toEqual(false);
      expect(result.transactionsHash.value).not.toEqual(
        publicInput.transactionsHash.value
      );
      expect(result.eternalTransactionsHash.value).not.toEqual(
        publicInput.eternalTransactionsHash.value
      );
    });
  });
});
