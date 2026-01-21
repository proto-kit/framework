import {
  AreProofsEnabled,
  CompilableModule,
  CompileArtifact,
  CompileRegistry,
  PlainZkProgram,
  provableMethod,
  WithZkProgrammable,
  ZkProgrammable,
} from "@proto-kit/common";
import { Bool, Field, SelfProof, VerificationKey, ZkProgram } from "o1js";
import { inject, injectable, injectAll } from "tsyringe";

import { ProvableNetworkState } from "../../model/network/NetworkState";
import { ProtocolModule } from "../../protocol/ProtocolModule";
import { MethodPublicOutput } from "../../model/MethodPublicOutput";
import {
  AfterTransactionHookArguments,
  BeforeTransactionHookArguments,
  ProvableTransactionHook,
  toAfterTransactionHookArgument,
  toBeforeTransactionHookArgument,
} from "../../protocol/ProvableTransactionHook";
import { StateServiceProvider } from "../../state/StateServiceProvider";
import { RuntimeVerificationKeyRootService } from "../block/services/RuntimeVerificationKeyRootService";
import { addTransactionToBundle, executeHooks } from "../utils";
import { SignedTransaction } from "../../model/transaction/SignedTransaction";
import {
  MethodVKConfigData,
  MinimalVKTreeService,
  RuntimeVerificationKeyAttestation,
} from "../block/accummulators/RuntimeVerificationKeyTree";

import {
  TransactionProverExecutionData,
  DynamicRuntimeProof,
  TransactionProof,
  TransactionProvable,
  TransactionProverArguments,
  TransactionProverPublicInput,
  TransactionProverPublicOutput,
  TransactionProverState,
  TransactionProverTransactionArguments,
} from "./TransactionProvable";

const errors = {
  invalidZkProgramTreeRoot: () =>
    "Root hash of the provided zkProgram config witness is invalid",

  propertyNotMatchingStep: (propertyName: string, step: string) =>
    `${propertyName} not matching: ${step}`,

  transactionsHashNotMatching: (step: string) =>
    errors.propertyNotMatchingStep("Transactions hash", step),

  bundlesHashNotMatching: (step: string) =>
    errors.propertyNotMatchingStep("Bundles hash", step),
};

type ApplyTransactionArguments = Omit<
  TransactionProverTransactionArguments,
  "verificationKeyAttestation"
>;

type TransactionHookArgument<T extends "before" | "after"> = T extends "before"
  ? BeforeTransactionHookArguments
  : AfterTransactionHookArguments;

export class TransactionProverZkProgrammable extends ZkProgrammable<
  TransactionProverPublicInput,
  TransactionProverPublicOutput
> {
  public constructor(
    private readonly prover: TransactionProver,
    private readonly transactionHooks: ProvableTransactionHook<unknown>[],
    private readonly stateServiceProvider: StateServiceProvider,
    private readonly verificationKeyService: MinimalVKTreeService
  ) {
    super();
  }

  name = "TransactionProver";

  public get areProofsEnabled(): AreProofsEnabled | undefined {
    return this.prover.areProofsEnabled;
  }

  /**
   * Applies and checks the two proofs and applies the corresponding state
   * changes to the given state.
   *
   * The rough high level workflow of this function:
   * 1. Execute beforeTransaction hooks, pushing the ST batch
   * 2. Add Transaction to bundle, meaning appending it to all the respective commitments
   * 3. Push the runtime ST batch
   * 4. Execute afterTransaction hooks, pushing the ST batch
   * 5. Some consistency checks and signature verification
   *
   * @param fromState The from-state of the BlockProver
   * @param runtimeOutput
   * @param executionData
   * @param networkState
   * @param bundleListPreimage
   * @returns The new BlockProver-state to be used as public output
   */
  public async applyTransaction(
    fromState: TransactionProverState,
    runtimeOutput: MethodPublicOutput,
    executionData: ApplyTransactionArguments,
    networkState: ProvableNetworkState
  ): Promise<TransactionProverState> {
    const { transaction, signature } = executionData;

    let state = { ...fromState };

    const { isMessage } = runtimeOutput;

    const beforeTxHookArguments = toBeforeTransactionHookArgument(
      executionData,
      networkState,
      state
    );

    // Apply beforeTransaction hook state transitions
    const beforeBatch = await this.executeTransactionHooks(
      "before",
      async (module, args) => await module.beforeTransaction(args),
      beforeTxHookArguments,
      isMessage
    );

    state.pendingSTBatches.push(beforeBatch);

    state.pendingSTBatches.push({
      batchHash: runtimeOutput.stateTransitionsHash,
      applied: runtimeOutput.status,
    });

    state = addTransactionToBundle(state, runtimeOutput.isMessage, transaction);

    // Apply afterTransaction hook state transitions
    const afterTxHookArguments = toAfterTransactionHookArgument(
      executionData,
      networkState,
      state,
      runtimeOutput
    );

    // Switch to different state set for afterTx hooks
    this.stateServiceProvider.popCurrentStateService();

    const afterBatch = await this.executeTransactionHooks(
      "after",
      async (module, args) => await module.afterTransaction(args),
      afterTxHookArguments,
      isMessage
    );
    state.pendingSTBatches.push(afterBatch);

    // Check transaction integrity against appProof
    const blockTransactionHash = transaction.hash();

    blockTransactionHash.assertEquals(
      runtimeOutput.transactionHash,
      "Transactions provided in AppProof and BlockProof do not match"
    );

    // Check transaction signature
    new SignedTransaction({
      transaction,
      signature,
    })
      .validateSignature()
      .or(isMessage)
      .assertTrue("Transaction signature not valid");

    // Validate layout of transaction witness
    transaction.assertTransactionType(isMessage);

    return new TransactionProverState(state);
  }

  private verifyVerificationKeyAttestation(
    attestation: RuntimeVerificationKeyAttestation,
    methodId: Field
  ): VerificationKey {
    // Verify the [methodId, vk] tuple against the baked-in vk tree root
    const { verificationKey, witness: verificationKeyTreeWitness } =
      attestation;

    const root = Field(this.verificationKeyService.getRoot());
    const calculatedRoot = verificationKeyTreeWitness.calculateRoot(
      new MethodVKConfigData({
        methodId: methodId,
        vkHash: verificationKey.hash,
      }).hash()
    );
    root.assertEquals(calculatedRoot, errors.invalidZkProgramTreeRoot());

    return verificationKey;
  }

  private async executeTransactionHooks<T extends "before" | "after">(
    type: T,
    hook: (
      module: ProvableTransactionHook<unknown>,
      args: TransactionHookArgument<T>
    ) => Promise<void>,
    hookArguments: TransactionHookArgument<T>,
    isMessage: Bool
  ) {
    const { batch, rawStatus } = await executeHooks(
      hookArguments,
      `${type}Transaction`,
      async () => {
        for (const module of this.transactionHooks) {
          // eslint-disable-next-line no-await-in-loop
          await hook(module, hookArguments);
        }
      },
      isMessage
    );

    // This is going to set applied to false in case the hook fails
    // (that's only possible for messages though as others are hard-asserted)
    batch.applied = rawStatus;

    return batch;
  }

  public async proveTransactionInternal(
    publicInput: TransactionProverPublicInput,
    runtimeProof: DynamicRuntimeProof,
    transaction: TransactionProverTransactionArguments,
    args: TransactionProverArguments
  ): Promise<TransactionProverPublicOutput> {
    const state = TransactionProverState.fromCommitments(publicInput, args);

    state.bundleList.checkLastBundleElement(state, args.networkState);

    const verificationKey = this.verifyVerificationKeyAttestation(
      transaction.verificationKeyAttestation,
      transaction.transaction.methodId
    );

    runtimeProof.verify(verificationKey);

    const result = await this.applyTransaction(
      state,
      runtimeProof.publicOutput,
      transaction,
      args.networkState
    );

    result.bundleList.addToBundle(result, args.networkState);

    return result.toCommitments();
  }

  @provableMethod()
  public async proveTransaction(
    publicInput: TransactionProverPublicInput,
    runtimeProof: DynamicRuntimeProof,
    executionData: TransactionProverExecutionData
  ): Promise<TransactionProverPublicOutput> {
    return await this.proveTransactionInternal(
      publicInput,
      runtimeProof,
      executionData.transaction,
      executionData.args
    );
  }

  @provableMethod()
  public async proveTransactions(
    publicInput: TransactionProverPublicInput,
    runtimeProof1: DynamicRuntimeProof,
    runtimeProof2: DynamicRuntimeProof,
    executionData1: TransactionProverExecutionData,
    executionData2: TransactionProverExecutionData
  ): Promise<TransactionProverPublicOutput> {
    const state1 = await this.proveTransactionInternal(
      publicInput,
      runtimeProof1,
      executionData1.transaction,
      executionData1.args
    );

    // Switch to next state record for 2nd tx beforeTx hook
    this.stateServiceProvider.popCurrentStateService();

    return await this.proveTransactionInternal(
      state1,
      runtimeProof2,
      executionData2.transaction,
      executionData2.args
    );
  }

  @provableMethod()
  public async merge(
    publicInput: TransactionProverPublicInput,
    proof1: TransactionProof,
    proof2: TransactionProof
  ): Promise<TransactionProverPublicOutput> {
    proof1.verify();
    proof2.verify();

    // Check bundlesHash
    publicInput.bundlesHash.assertEquals(
      proof1.publicInput.bundlesHash,
      errors.bundlesHashNotMatching("publicInput.from -> proof1.from")
    );
    proof1.publicOutput.bundlesHash.assertEquals(
      proof2.publicInput.bundlesHash,
      errors.bundlesHashNotMatching("proof1.to -> proof2.from")
    );

    // Check eternalTransactionsHash
    publicInput.eternalTransactionsHash.assertEquals(
      proof1.publicInput.eternalTransactionsHash,
      errors.transactionsHashNotMatching("publicInput.from -> proof1.from")
    );
    proof1.publicOutput.eternalTransactionsHash.assertEquals(
      proof2.publicInput.eternalTransactionsHash,
      errors.transactionsHashNotMatching("proof1.to -> proof2.from")
    );

    // Check incomingMessagesHash
    publicInput.incomingMessagesHash.assertEquals(
      proof1.publicInput.incomingMessagesHash,
      errors.propertyNotMatchingStep(
        "IncomingMessagesHash",
        "publicInput.from -> proof1.from"
      )
    );
    proof1.publicOutput.incomingMessagesHash.assertEquals(
      proof2.publicInput.incomingMessagesHash,
      errors.propertyNotMatchingStep(
        "IncomingMessagesHash",
        "proof1.to -> proof2.from"
      )
    );

    return new TransactionProverPublicOutput({
      bundlesHash: proof2.publicOutput.bundlesHash,
      eternalTransactionsHash: proof2.publicOutput.eternalTransactionsHash,
      incomingMessagesHash: proof2.publicOutput.incomingMessagesHash,
    });
  }

  /**
   * Creates the BlockProver ZkProgram.
   * Recursive linking of proofs is done via the previously
   * injected StateTransitionProver and the required AppChainProof class
   */
  public zkProgramFactory(): PlainZkProgram<
    TransactionProverPublicInput,
    TransactionProverPublicOutput
  >[] {
    const { prover } = this;
    const proveTransaction = prover.proveTransaction.bind(prover);
    const proveTransactions = prover.proveTransactions.bind(prover);
    const merge = prover.merge.bind(prover);

    const program = ZkProgram({
      name: "TransactionProver",
      publicInput: TransactionProverPublicInput,
      publicOutput: TransactionProverPublicOutput,

      methods: {
        proveTransaction: {
          privateInputs: [DynamicRuntimeProof, TransactionProverExecutionData],

          async method(
            publicInput: TransactionProverPublicInput,
            runtimeProof: DynamicRuntimeProof,
            executionData: TransactionProverExecutionData
          ) {
            return {
              publicOutput: await proveTransaction(
                publicInput,
                runtimeProof,
                executionData
              ),
            };
          },
        },

        proveTransactions: {
          privateInputs: [
            DynamicRuntimeProof,
            DynamicRuntimeProof,
            TransactionProverExecutionData,
            TransactionProverExecutionData,
          ],

          async method(
            publicInput: TransactionProverPublicInput,
            runtimeProof1: DynamicRuntimeProof,
            runtimeProof2: DynamicRuntimeProof,
            executionData1: TransactionProverExecutionData,
            executionData2: TransactionProverExecutionData
          ) {
            return {
              publicOutput: await proveTransactions(
                publicInput,
                runtimeProof1,
                runtimeProof2,
                executionData1,
                executionData2
              ),
            };
          },
        },

        merge: {
          privateInputs: [
            SelfProof<
              TransactionProverPublicInput,
              TransactionProverPublicOutput
            >,
            SelfProof<
              TransactionProverPublicInput,
              TransactionProverPublicOutput
            >,
          ],

          async method(
            publicInput: TransactionProverPublicInput,
            proof1: TransactionProof,
            proof2: TransactionProof
          ) {
            return { publicOutput: await merge(publicInput, proof1, proof2) };
          },
        },
      },
    });

    const methods = {
      proveTransaction: program.proveTransaction,
      proveTransactions: program.proveTransactions,
      merge: program.merge,
    };

    const SelfProofClass = ZkProgram.Proof(program);

    return [
      {
        name: program.name,
        compile: program.compile.bind(program),
        verify: program.verify.bind(program),
        analyzeMethods: program.analyzeMethods.bind(program),
        Proof: SelfProofClass,
        methods,
      },
    ];
  }
}

/**
 * BlockProver class, which aggregates a AppChainProof and
 * a StateTransitionProof into a single BlockProof, that can
 * then be merged to be committed to the base-layer contract
 */
@injectable()
export class TransactionProver
  extends ProtocolModule
  implements TransactionProvable, CompilableModule
{
  public zkProgrammable: TransactionProverZkProgrammable;

  public constructor(
    @inject("Runtime")
    public readonly runtime: WithZkProgrammable<undefined, MethodPublicOutput> &
      CompilableModule,
    @injectAll("ProvableTransactionHook")
    transactionHooks: ProvableTransactionHook<unknown>[],
    @inject("StateServiceProvider")
    stateServiceProvider: StateServiceProvider,
    verificationKeyService: RuntimeVerificationKeyRootService
  ) {
    super();
    this.zkProgrammable = new TransactionProverZkProgrammable(
      this,
      transactionHooks,
      stateServiceProvider,
      verificationKeyService
    );
  }

  public async compile(
    registry: CompileRegistry
  ): Promise<Record<string, CompileArtifact> | undefined> {
    return await registry.forceProverExists(async () => {
      await this.runtime.compile(registry);
      return await this.zkProgrammable.compile(registry);
    });
  }

  public proveTransaction(
    publicInput: TransactionProverPublicInput,
    runtimeProof: DynamicRuntimeProof,
    executionData: TransactionProverExecutionData
  ): Promise<TransactionProverPublicOutput> {
    return this.zkProgrammable.proveTransaction(
      publicInput,
      runtimeProof,
      executionData
    );
  }

  public proveTransactions(
    publicInput: TransactionProverPublicInput,
    runtimeProof1: DynamicRuntimeProof,
    runtimeProof2: DynamicRuntimeProof,
    executionData1: TransactionProverExecutionData,
    executionData2: TransactionProverExecutionData
  ): Promise<TransactionProverPublicOutput> {
    return this.zkProgrammable.proveTransactions(
      publicInput,
      runtimeProof1,
      runtimeProof2,
      executionData1,
      executionData2
    );
  }

  public merge(
    publicInput: TransactionProverPublicInput,
    proof1: TransactionProof,
    proof2: TransactionProof
  ): Promise<TransactionProverPublicOutput> {
    return this.zkProgrammable.merge(publicInput, proof1, proof2);
  }
}
