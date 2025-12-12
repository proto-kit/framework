import { TypedClass, ChildVerificationKeyService } from "@proto-kit/common";
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
  VerificationKey,
  Permissions,
  Struct,
  Provable,
  TokenId,
  DeployArgs,
} from "o1js";

import { NetworkState } from "../../../model/network/NetworkState";
import { ProvableSettlementHook } from "../../modularity/ProvableSettlementHook";
import { DispatchContractType } from "../DispatchSmartContract";
import { BridgeContractType } from "../BridgeContract";
import { TokenBridgeDeploymentAuth } from "../authorizations/TokenBridgeDeploymentAuth";
import { UpdateMessagesHashAuth } from "../authorizations/UpdateMessagesHashAuth";

import { DynamicBlockProof, SettlementBase } from "./SettlementBase";

/* eslint-disable @typescript-eslint/lines-between-class-members */

export class TokenMapping extends Struct({
  tokenId: Field,
  publicKey: PublicKey,
}) {}

export interface BridgingSettlementContractType {
  authorizationField: State<Field>;

  deployAndInitialize: (
    args: DeployArgs | undefined,
    permissions: Permissions,
    sequencer: PublicKey,
    dispatchContract: PublicKey
  ) => Promise<void>;

  assertStateRoot: (root: Field) => AccountUpdate;
  settle: (
    blockProof: DynamicBlockProof,
    signature: Signature,
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

export abstract class BridgingSettlementContractBase extends SettlementBase {
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

  abstract dispatchContractAddress: State<PublicKey>;

  abstract authorizationField: State<Field>;

  // Not @state
  // abstract offchainStateCommitmentsHash: State<Field>;

  public assertStateRoot(root: Field): AccountUpdate {
    this.stateRoot.requireEquals(root);
    return this.self;
  }

  protected async initializeBaseBridging(
    sequencer: PublicKey,
    dispatchContract: PublicKey
  ) {
    await super.initializeBase(sequencer);

    this.dispatchContractAddress.set(dispatchContract);
  }

  // TODO Like these properties, I am too lazy to properly infer the types here
  private assertLazyConfigsInitialized() {
    const uninitializedProperties: string[] = [];
    const { args } = BridgingSettlementContractBase;
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

  protected async deployTokenBridge(tokenId: Field, address: PublicKey) {
    Provable.asProver(() => {
      this.assertLazyConfigsInitialized();
    });

    const { args } = BridgingSettlementContractBase;
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

    const dispatchContractAddress =
      this.dispatchContractAddress.getAndRequireEquals();

    // Set authorization for the auth callback, that we need
    this.authorizationField.set(
      new TokenBridgeDeploymentAuth({
        target: dispatchContractAddress,
        tokenId,
        address,
      }).hash()
    );
    const dispatchContract =
      new BridgingSettlementContractBase.args.DispatchContract(
        dispatchContractAddress
      );
    await dispatchContract.enableTokenDeposits(tokenId, address, this.address);
  }

  protected async settleBaseBridging(
    blockProof: DynamicBlockProof,
    signature: Signature,
    publicKey: PublicKey,
    inputNetworkState: NetworkState,
    outputNetworkState: NetworkState,
    newPromisedMessagesHash: Field
  ) {
    await super.settleBase(
      blockProof,
      signature,
      publicKey,
      inputNetworkState,
      outputNetworkState,
      newPromisedMessagesHash
    );

    const dispatchContractAddress =
      this.dispatchContractAddress.getAndRequireEquals();

    const { DispatchContract } =
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      (this.constructor as typeof BridgingSettlementContractBase).args;

    // Get dispatch contract values
    // These values are witnesses but will be checked later on the AU
    // call to the dispatch contract via .updateMessagesHash()
    const dispatchContract = new DispatchContract(dispatchContractAddress);
    const promisedMessagesHash = dispatchContract.promisedMessagesHash.get();

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
  }
}

export class BridgingSettlementContract
  extends BridgingSettlementContractBase
  implements BridgingSettlementContractType
{
  @state(Field) public sequencerKey = State<Field>();
  @state(UInt32) public lastSettlementL1BlockHeight = State<UInt32>();

  @state(Field) public stateRoot = State<Field>();
  @state(Field) public networkStateHash = State<Field>();
  @state(Field) public blockHashRoot = State<Field>();

  @state(PublicKey) public dispatchContractAddress = State<PublicKey>();

  @state(Field) public authorizationField = State<Field>();

  public async deployAndInitialize(
    args: DeployArgs | undefined,
    permissions: Permissions,
    sequencer: PublicKey,
    dispatchContract: PublicKey
  ): Promise<void> {
    await super.deploy(args);

    this.self.account.permissions.set(permissions);

    await this.initializeBaseBridging(sequencer, dispatchContract);
  }

  @method async approveBase(forest: AccountUpdateForest) {
    this.checkZeroBalanceChange(forest);
  }

  @method
  public async addTokenBridge(tokenId: Field, address: PublicKey) {
    await this.deployTokenBridge(tokenId, address);
  }

  @method
  public async settle(
    blockProof: DynamicBlockProof,
    signature: Signature,
    publicKey: PublicKey,
    inputNetworkState: NetworkState,
    outputNetworkState: NetworkState,
    newPromisedMessagesHash: Field
  ) {
    return await this.settleBaseBridging(
      blockProof,
      signature,
      publicKey,
      inputNetworkState,
      outputNetworkState,
      newPromisedMessagesHash
    );
  }
}

/* eslint-enable @typescript-eslint/lines-between-class-members */
