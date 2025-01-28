import {
  prefixToField,
  RollupMerkleTree,
  TypedClass,
  mapSequential,
  ChildVerificationKeyService,
} from "@proto-kit/common";
import {
  AccountUpdate,
  Bool,
  Field,
  method,
  PublicKey,
  Signature,
  SmartContract,
  State,
  state,
  UInt32,
  AccountUpdateForest,
  TokenContractV2,
  PrivateKey,
  VerificationKey,
  Permissions,
  Struct,
  Provable,
  TokenId,
  DynamicProof,
} from "o1js";

import { NetworkState } from "../../model/network/NetworkState";
import { BlockHashMerkleTree } from "../../prover/block/accummulators/BlockHashMerkleTree";
import {
  BlockProverPublicInput,
  BlockProverPublicOutput,
} from "../../prover/block/BlockProvable";
import {
  ProvableSettlementHook,
  SettlementHookInputs,
  SettlementStateRecord,
} from "../modularity/ProvableSettlementHook";

import { DispatchContractType } from "./DispatchSmartContract";
import { BridgeContractType } from "./BridgeContract";
import { TokenBridgeDeploymentAuth } from "./authorizations/TokenBridgeDeploymentAuth";
import { UpdateMessagesHashAuth } from "./authorizations/UpdateMessagesHashAuth";

/* eslint-disable @typescript-eslint/lines-between-class-members */

export class DynamicBlockProof extends DynamicProof<
  BlockProverPublicInput,
  BlockProverPublicOutput
> {
  public static publicInputType = BlockProverPublicInput;

  public static publicOutputType = BlockProverPublicOutput;

  public static maxProofsVerified = 2 as const;
}

export class TokenMapping extends Struct({
  tokenId: Field,
  publicKey: PublicKey,
}) {}

export interface SettlementContractType {
  authorizationField: State<Field>;

  initialize: (
    sequencer: PublicKey,
    dispatchContract: PublicKey,
    bridgeContract: PublicKey,
    contractKey: PrivateKey
  ) => Promise<void>;
  assertStateRoot: (root: Field) => AccountUpdate;
  settle: (
    blockProof: DynamicBlockProof,
    signature: Signature,
    dispatchContractAddress: PublicKey,
    publicKey: PublicKey,
    inputNetworkState: NetworkState,
    outputNetworkState: NetworkState,
    newPromisedMessagesHash: Field
  ) => Promise<void>;
  addTokenBridge: (
    tokenId: Field,
    address: PublicKey,
    dispatchContract: PublicKey
  ) => Promise<void>;
}

// Some random prefix for the sequencer signature
export const BATCH_SIGNATURE_PREFIX = prefixToField("pk-batchSignature");

// @singleton()
// export class SettlementSmartContractStaticArgs {
//   public args?: {
//     DispatchContract: TypedClass<DispatchContractType & SmartContract>;
//     hooks: ProvableSettlementHook<unknown>[];
//     escapeHatchSlotsInterval: number;
//     BridgeContract: TypedClass<BridgeContractType> & typeof SmartContract;
//     // Lazily initialized
//     BridgeContractVerificationKey: VerificationKey | undefined;
//     BridgeContractPermissions: Permissions | undefined;
//     signedSettlements: boolean | undefined;
//   };
// }

export abstract class SettlementSmartContractBase extends TokenContractV2 {
  // This pattern of injecting args into a smartcontract is currently the only
  // viable solution that works given the inheritance issues of o1js
  // public static args = container.resolve(SettlementSmartContractStaticArgs);
  public static args: {
    DispatchContract: TypedClass<DispatchContractType & SmartContract>;
    hooks: ProvableSettlementHook<unknown>[];
    escapeHatchSlotsInterval: number;
    BridgeContract: TypedClass<BridgeContractType> & typeof SmartContract;
    // Lazily initialized
    BridgeContractVerificationKey: VerificationKey | undefined;
    BridgeContractPermissions: Permissions | undefined;
    signedSettlements: boolean | undefined;
    ChildVerificationKeyService: ChildVerificationKeyService;
  };

  events = {
    "token-bridge-deployed": TokenMapping,
  };

  abstract sequencerKey: State<Field>;
  abstract lastSettlementL1BlockHeight: State<UInt32>;
  abstract stateRoot: State<Field>;
  abstract networkStateHash: State<Field>;
  abstract blockHashRoot: State<Field>;
  abstract dispatchContractAddressX: State<Field>;

  abstract authorizationField: State<Field>;

  // Not @state
  // abstract offchainStateCommitmentsHash: State<Field>;

  public assertStateRoot(root: Field): AccountUpdate {
    this.stateRoot.requireEquals(root);
    return this.self;
  }

  // TODO Like these properties, I am too lazy to properly infer the types here
  private assertLazyConfigsInitialized() {
    const uninitializedProperties: string[] = [];
    const { args } = SettlementSmartContractBase;
    if (args.BridgeContractPermissions === undefined) {
      uninitializedProperties.push("BridgeContractPermissions");
    }
    if (args.signedSettlements === undefined) {
      uninitializedProperties.push("signedSettlements");
    }
    if (uninitializedProperties.length > 0) {
      throw new Error(
        `Lazy configs of SettlementSmartContract haven't been initialized ${uninitializedProperties.reduce(
          (a, b) => `${a},${b}`
        )}`
      );
    }
  }

  protected async deployTokenBridge(
    tokenId: Field,
    address: PublicKey,
    dispatchContractAddress: PublicKey,
    dispatchContractPreconditionEnforced = false
  ) {
    Provable.asProver(() => {
      this.assertLazyConfigsInitialized();
    });

    const { args } = SettlementSmartContractBase;
    const BridgeContractClass = args.BridgeContract;
    const bridgeContract = new BridgeContractClass(address, tokenId);

    const {
      BridgeContractVerificationKey,
      signedSettlements,
      BridgeContractPermissions,
    } = args;

    if (
      signedSettlements === undefined ||
      BridgeContractPermissions === undefined
    ) {
      throw new Error(
        "Static arguments for SettlementSmartContract not initialized"
      );
    }

    if (
      BridgeContractVerificationKey !== undefined &&
      !BridgeContractVerificationKey.hash.isConstant()
    ) {
      throw new Error("Bridge contract verification key has to be constants");
    }

    // This function is not a zkapps method, therefore it will be part of this methods execution
    // The returning account update (owner.self) is therefore part of this circuit and is assertable
    const deploymentAccountUpdate = await bridgeContract.deployProvable(
      args.BridgeContractVerificationKey,
      args.signedSettlements!,
      args.BridgeContractPermissions!,
      this.address
    );

    this.approve(deploymentAccountUpdate);

    this.self.body.mayUseToken = {
      // Only set this if we deploy a custom token
      parentsOwnToken: tokenId.equals(TokenId.default).not(),
      inheritFromParent: Bool(false),
    };

    this.emitEvent(
      "token-bridge-deployed",
      new TokenMapping({
        tokenId: tokenId,
        publicKey: address,
      })
    );

    // We can't set a precondition twice, for the $mina bridge deployment that
    // would be the case, so we disable it in this case
    if (!dispatchContractPreconditionEnforced) {
      this.dispatchContractAddressX.requireEquals(dispatchContractAddress.x);
    }

    // Set authorization for the auth callback, that we need
    this.authorizationField.set(
      new TokenBridgeDeploymentAuth({
        target: dispatchContractAddress,
        tokenId,
        address,
      }).hash()
    );
    const dispatchContract =
      new SettlementSmartContractBase.args.DispatchContract(
        dispatchContractAddress
      );
    await dispatchContract.enableTokenDeposits(tokenId, address, this.address);
  }

  protected async initializeBase(
    sequencer: PublicKey,
    dispatchContract: PublicKey,
    bridgeContract: PublicKey,
    contractKey: PrivateKey
  ) {
    this.sequencerKey.getAndRequireEquals().assertEquals(Field(0));
    this.stateRoot.getAndRequireEquals().assertEquals(Field(0));
    this.blockHashRoot.getAndRequireEquals().assertEquals(Field(0));
    this.networkStateHash.getAndRequireEquals().assertEquals(Field(0));
    this.dispatchContractAddressX.getAndRequireEquals().assertEquals(Field(0));

    this.sequencerKey.set(sequencer.x);
    this.stateRoot.set(Field(RollupMerkleTree.EMPTY_ROOT));
    this.blockHashRoot.set(Field(BlockHashMerkleTree.EMPTY_ROOT));
    this.networkStateHash.set(NetworkState.empty().hash());
    this.dispatchContractAddressX.set(dispatchContract.x);

    const { DispatchContract } = SettlementSmartContractBase.args;
    const contractInstance = new DispatchContract(dispatchContract);
    await contractInstance.initialize(this.address);

    // Deploy bridge contract for $Mina
    await this.deployTokenBridge(
      this.tokenId,
      bridgeContract,
      dispatchContract,
      true
    );

    contractKey.toPublicKey().assertEquals(this.address);
  }

  protected async settleBase(
    blockProof: DynamicBlockProof,
    signature: Signature,
    dispatchContractAddress: PublicKey,
    publicKey: PublicKey,
    inputNetworkState: NetworkState,
    outputNetworkState: NetworkState,
    newPromisedMessagesHash: Field
  ) {
    // Brought in as a constant
    const blockProofVk =
      SettlementSmartContractBase.args.ChildVerificationKeyService.getVerificationKey(
        "BlockProver"
      );
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
    const onChainDispatchContractAddressX =
      this.dispatchContractAddressX.getAndRequireEquals();

    onChainDispatchContractAddressX.assertEquals(
      dispatchContractAddress.x,
      "DispatchContract address not provided correctly"
    );

    const { DispatchContract, escapeHatchSlotsInterval, hooks } =
      SettlementSmartContractBase.args;

    // Get dispatch contract values
    // These values are witnesses but will be checked later on the AU
    // call to the dispatch contract via .updateMessagesHash()
    const dispatchContract = new DispatchContract(dispatchContractAddress);
    const promisedMessagesHash = dispatchContract.promisedMessagesHash.get();

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

    blockProof.publicOutput.closed.assertEquals(
      Bool(true),
      "Supplied proof is not a closed BlockProof"
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

    // Assert and apply deposit commitments
    promisedMessagesHash.assertEquals(
      blockProof.publicOutput.incomingMessagesHash,
      "Promised messages not honored"
    );

    // Set authorization for the dispatchContract to verify the messages hash update
    this.authorizationField.set(
      new UpdateMessagesHashAuth({
        target: dispatchContract.address,
        executedMessagesHash: promisedMessagesHash,
        newPromisedMessagesHash,
      }).hash()
    );

    // Call DispatchContract
    // This call checks that the promisedMessagesHash, which is already proven
    // to be the blockProofs publicoutput, is actually the current on-chain
    // promisedMessageHash. It also checks the newPromisedMessagesHash to be
    // a current sequencestate value
    await dispatchContract.updateMessagesHash(
      promisedMessagesHash,
      newPromisedMessagesHash
    );

    this.lastSettlementL1BlockHeight.set(minBlockHeightIncluded);
  }
}

export class SettlementSmartContract
  extends SettlementSmartContractBase
  implements SettlementContractType
{
  @state(Field) public sequencerKey = State<Field>();
  @state(UInt32) public lastSettlementL1BlockHeight = State<UInt32>();

  @state(Field) public stateRoot = State<Field>();
  @state(Field) public networkStateHash = State<Field>();
  @state(Field) public blockHashRoot = State<Field>();

  @state(Field) public dispatchContractAddressX = State<Field>();

  @state(Field) public authorizationField = State<Field>();

  @method async approveBase(forest: AccountUpdateForest) {
    this.checkZeroBalanceChange(forest);
  }

  @method
  public async initialize(
    sequencer: PublicKey,
    dispatchContract: PublicKey,
    bridgeContract: PublicKey,
    contractKey: PrivateKey
  ) {
    await this.initializeBase(
      sequencer,
      dispatchContract,
      bridgeContract,
      contractKey
    );
  }

  @method
  public async addTokenBridge(
    tokenId: Field,
    address: PublicKey,
    dispatchContract: PublicKey
  ) {
    await this.deployTokenBridge(tokenId, address, dispatchContract);
  }

  @method
  public async settle(
    blockProof: DynamicBlockProof,
    signature: Signature,
    dispatchContractAddress: PublicKey,
    publicKey: PublicKey,
    inputNetworkState: NetworkState,
    outputNetworkState: NetworkState,
    newPromisedMessagesHash: Field
  ) {
    return await this.settleBase(
      blockProof,
      signature,
      dispatchContractAddress,
      publicKey,
      inputNetworkState,
      outputNetworkState,
      newPromisedMessagesHash
    );
  }
}

/* eslint-enable @typescript-eslint/lines-between-class-members */
