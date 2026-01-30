import {
  DeployArgs,
  DynamicProof,
  Field,
  Option,
  PublicKey,
  Signature,
  State,
  TokenContract,
  UInt32,
  Permissions,
} from "o1js";
import {
  ChildVerificationKeyService,
  LinkedMerkleTree,
  mapSequential,
  prefixToField,
} from "@proto-kit/common";
import { container } from "tsyringe";

import { BlockHashMerkleTree } from "../../../prover/block/accummulators/BlockHashMerkleTree";
import { NetworkState } from "../../../model/network/NetworkState";
import {
  ProvableSettlementHook,
  SettlementHookInputs,
  SettlementStateRecord,
} from "../../modularity/ProvableSettlementHook";
import {
  BlockProverPublicInput,
  BlockProverPublicOutput,
} from "../../../prover/block/BlockProvable";
import {
  ContractArgsRegistry,
  NaiveObjectSchema,
  StaticInitializationContract,
} from "../../ContractArgsRegistry";

/* eslint-disable @typescript-eslint/lines-between-class-members */

// Some random prefix for the sequencer signature
export const BATCH_SIGNATURE_PREFIX = prefixToField("pk-batchSignature");

export class DynamicBlockProof extends DynamicProof<
  BlockProverPublicInput,
  BlockProverPublicOutput
> {
  public static publicInputType = BlockProverPublicInput;

  public static publicOutputType = BlockProverPublicOutput;

  public static maxProofsVerified = 2 as const;
}

export interface SettlementContractType {
  sequencerKey: State<Field>;
  lastSettlementL1BlockHeight: State<UInt32>;
  stateRoot: State<Field>;
  networkStateHash: State<Field>;
  blockHashRoot: State<Field>;

  deployAndInitialize: (
    args: DeployArgs | undefined,
    permissions: Permissions,
    sequencer: PublicKey,
    dispatchContract: Option<PublicKey>
  ) => Promise<void>;

  settle: (
    blockProof: DynamicBlockProof,
    signature: Signature,
    publicKey: PublicKey,
    inputNetworkState: NetworkState,
    outputNetworkState: NetworkState,
    newPromisedMessagesHash: Field
  ) => Promise<void>;
}

export interface SettlementContractArgs {
  hooks: ProvableSettlementHook<unknown>[];
  escapeHatchSlotsInterval: number;
  signedSettlements: boolean;
  ChildVerificationKeyService: ChildVerificationKeyService;
}

export const SettlementContractArgsSchema: NaiveObjectSchema<SettlementContractArgs> =
  {
    ChildVerificationKeyService: "Required",
    hooks: "Required",
    escapeHatchSlotsInterval: "Required",
    signedSettlements: "Required",
  };

export abstract class SettlementBase
  extends TokenContract
  implements StaticInitializationContract<SettlementContractArgs>
{
  getInitializationArgs(): SettlementContractArgs {
    return container
      .resolve(ContractArgsRegistry)
      .getArgs("SettlementContract", SettlementContractArgsSchema);
  }

  abstract sequencerKey: State<Field>;
  abstract lastSettlementL1BlockHeight: State<UInt32>;
  abstract stateRoot: State<Field>;
  abstract networkStateHash: State<Field>;
  abstract blockHashRoot: State<Field>;

  protected async initializeBase(sequencer: PublicKey) {
    this.sequencerKey.set(sequencer.x);
    this.stateRoot.set(LinkedMerkleTree.EMPTY_ROOT);
    this.blockHashRoot.set(Field(BlockHashMerkleTree.EMPTY_ROOT));
    this.networkStateHash.set(NetworkState.empty().hash());
  }

  abstract settle(
    blockProof: DynamicBlockProof,
    signature: Signature,
    publicKey: PublicKey,
    inputNetworkState: NetworkState,
    outputNetworkState: NetworkState,
    newPromisedMessagesHash: Field
  ): Promise<void>;

  abstract deployAndInitialize(
    args: DeployArgs | undefined,
    permissions: Permissions,
    sequencer: PublicKey,
    dispatchContract: Option<PublicKey>
  ): Promise<void>;

  protected async settleBase(
    blockProof: DynamicBlockProof,
    signature: Signature,
    publicKey: PublicKey,
    inputNetworkState: NetworkState,
    outputNetworkState: NetworkState,
    newPromisedMessagesHash: Field
  ) {
    const {
      escapeHatchSlotsInterval,
      hooks,
      ChildVerificationKeyService: childVerificationKeyService,
    } = this.getInitializationArgs();

    // Brought in as a constant
    const blockProofVk =
      childVerificationKeyService.getVerificationKey("BlockProver");
    if (!blockProofVk.hash.isConstant()) {
      throw new Error("Sanity check - vk hash has to be constant");
    }
    // Verify the blockproof

    blockProof.verify(blockProofVk);
    // Get and assert on-chain values
    const stateRoot = this.stateRoot.getAndRequireEquals();
    const networkStateHash = this.networkStateHash.getAndRequireEquals();
    const blockHashRoot = this.blockHashRoot.getAndRequireEquals();
    const sequencerKey = this.sequencerKey.getAndRequireEquals();

    const lastSettlementL1BlockHeight =
      this.lastSettlementL1BlockHeight.getAndRequireEquals();

    // Get block height and use the lower bound for all ops
    const minBlockHeightIncluded = this.network.blockchainLength.get();
    this.network.blockchainLength.requireBetween(
      minBlockHeightIncluded,
      // 5 because that is the length the newPromisedMessagesHash will be valid
      minBlockHeightIncluded.add(4)
    );

    // Check signature/escape catch
    publicKey.x.assertEquals(
      sequencerKey,
      "Sequencer public key witness not matching"
    );
    const signatureValid = signature.verify(publicKey, [
      BATCH_SIGNATURE_PREFIX,
      lastSettlementL1BlockHeight.value,
    ]);
    const escapeHatchActivated = lastSettlementL1BlockHeight
      .add(UInt32.from(escapeHatchSlotsInterval))
      .lessThan(minBlockHeightIncluded);
    signatureValid
      .or(escapeHatchActivated)
      .assertTrue(
        "Sequencer signature not valid and escape hatch not activated"
      );

    // Assert correctness of networkState witness
    inputNetworkState
      .hash()
      .assertEquals(networkStateHash, "InputNetworkState witness not valid");
    outputNetworkState
      .hash()
      .assertEquals(
        blockProof.publicOutput.networkStateHash,
        "OutputNetworkState witness not valid"
      );

    // Check remainders are zero
    blockProof.publicOutput.proverStateRemainder.assertEquals(
      Field(0),
      "Supplied proof is has outstanding block prover state to be proven"
    );

    // Execute onSettlementHooks for additional checks
    const stateRecord: SettlementStateRecord = {
      blockHashRoot,
      stateRoot,
      networkStateHash,
      lastSettlementL1BlockHeight,
      sequencerKey: publicKey,
    };
    const inputs: SettlementHookInputs = {
      blockProof,
      contractState: stateRecord,
      newPromisedMessagesHash,
      fromNetworkState: inputNetworkState,
      toNetworkState: outputNetworkState,
      currentL1BlockHeight: minBlockHeightIncluded,
    };
    await mapSequential(hooks, async (hook) => {
      await hook.beforeSettlement(this, inputs);
    });

    // Apply blockProof
    stateRoot.assertEquals(
      blockProof.publicInput.stateRoot,
      "Input state root not matching"
    );

    networkStateHash.assertEquals(
      blockProof.publicInput.networkStateHash,
      "Input networkStateHash not matching"
    );
    blockHashRoot.assertEquals(
      blockProof.publicInput.blockHashRoot,
      "Input blockHashRoot not matching"
    );
    this.stateRoot.set(blockProof.publicOutput.stateRoot);
    this.networkStateHash.set(blockProof.publicOutput.networkStateHash);
    this.blockHashRoot.set(blockProof.publicOutput.blockHashRoot);

    this.lastSettlementL1BlockHeight.set(minBlockHeightIncluded);
  }
}

/* eslint-enable @typescript-eslint/lines-between-class-members */
