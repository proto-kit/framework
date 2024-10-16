import {
  AccountUpdate,
  Bool,
  Field,
  method,
  Poseidon,
  Provable,
  ProvableExtended,
  PublicKey,
  Reducer,
  SmartContract,
  State,
  state,
  TokenId,
  UInt64,
} from "o1js";
import { InMemoryMerkleTreeStorage, TypedClass } from "@proto-kit/common";

import { RuntimeMethodIdMapping } from "../../model/RuntimeLike";
import { RuntimeTransaction } from "../../model/transaction/RuntimeTransaction";
import {
  MinaActions,
  MinaEvents,
} from "../../utils/MinaPrefixedProvableHashList";
import { Deposit } from "../messages/Deposit";

import type { SettlementContractType } from "./SettlementSmartContract";
import { TokenBridgeDeploymentAuth } from "./authorizations/TokenBridgeDeploymentAuth";
import { UpdateMessagesHashAuth } from "./authorizations/UpdateMessagesHashAuth";
import {
  TokenBridgeAttestation,
  TokenBridgeEntry,
  TokenBridgeTree,
  TokenBridgeTreeAddition,
  TokenBridgeTreeWitness,
} from "./TokenBridgeTree";

export const ACTIONS_EMPTY_HASH = Reducer.initialActionState;

export interface DispatchContractType {
  updateMessagesHash: (
    executedMessagesHash: Field,
    newPromisedMessagesHash: Field
  ) => Promise<void>;
  initialize: (settlementContract: PublicKey) => Promise<void>;
  enableTokenDeposits: (
    tokenId: Field,
    bridgeContractAddress: PublicKey,
    settlementContractAddress: PublicKey
  ) => Promise<void>;

  promisedMessagesHash: State<Field>;
}

const tokenBridgeRoot = new TokenBridgeTree(
  new InMemoryMerkleTreeStorage()
).getRoot();

export abstract class DispatchSmartContractBase extends SmartContract {
  public static args: {
    methodIdMappings: RuntimeMethodIdMapping;
    incomingMessagesPaths: Record<string, `${string}.${string}`>;
    settlementContractClass?: TypedClass<SettlementContractType> &
      typeof SmartContract;
  };

  events = {
    "token-bridge-added": TokenBridgeTreeAddition,
    // We need a placeholder event here, so that o1js internally adds a identifier to the
    // emitted event-fields. That will lead to the o1js API being able to distinguish the
    // TokenBridgeEvents from the manually emitted events for the incoming messages
    "incoming-message-placeholder": Field,
  };

  abstract promisedMessagesHash: State<Field>;

  abstract honoredMessagesHash: State<Field>;

  abstract settlementContract: State<PublicKey>;

  abstract tokenBridgeRoot: State<Field>;

  abstract tokenBridgeCount: State<Field>;

  protected updateMessagesHashBase(
    executedMessagesHash: Field,
    newPromisedMessagesHash: Field
  ) {
    const promisedMessagesHash =
      this.promisedMessagesHash.getAndRequireEquals();
    this.honoredMessagesHash.getAndRequireEquals();

    executedMessagesHash.assertEquals(promisedMessagesHash);

    this.honoredMessagesHash.set(executedMessagesHash);

    // Assert and apply new promisedMessagesHash
    this.self.account.actionState.requireEquals(newPromisedMessagesHash);
    this.promisedMessagesHash.set(newPromisedMessagesHash);

    const settlementContractAddress =
      this.settlementContract.getAndRequireEquals();
    const settlementContract =
      new DispatchSmartContractBase.args.settlementContractClass!(
        settlementContractAddress
      );

    settlementContract.authorizationField.requireEquals(
      new UpdateMessagesHashAuth({
        target: this.address,
        executedMessagesHash,
        newPromisedMessagesHash,
      }).hash()
    );
    this.approve(settlementContract.self);
  }

  protected initializeBase(settlementContract: PublicKey) {
    this.promisedMessagesHash.getAndRequireEquals().assertEquals(Field(0));
    this.honoredMessagesHash.getAndRequireEquals().assertEquals(Field(0));
    this.settlementContract
      .getAndRequireEquals()
      .assertEquals(PublicKey.empty<typeof PublicKey>());

    this.promisedMessagesHash.set(ACTIONS_EMPTY_HASH);
    this.honoredMessagesHash.set(ACTIONS_EMPTY_HASH);
    this.settlementContract.set(settlementContract);
  }

  protected dispatchMessage<Type>(
    methodId: Field,
    value: Type,
    valueType: ProvableExtended<Type>
  ) {
    const args = valueType.toFields(value);
    // Should be the same as RuntimeTransaction.hash
    const argsHash = Poseidon.hash(args);
    const runtimeTransaction = RuntimeTransaction.fromMessage({
      methodId,
      argsHash,
    });

    // Append tx to incomingMessagesHash
    const actionData = runtimeTransaction.hashData();
    const actionHash = MinaActions.actionHash(actionData);

    this.self.body.actions = {
      hash: actionHash,
      data: [actionData],
    };

    // Find event index of placeholder event that we can use for manual event dispatching
    const eventIndex = Object.keys(this.events)
      .sort()
      .indexOf("incoming-message-placeholder");
    if (eventIndex === -1) {
      throw new Error("Unknown event type for placeholder event");
    }
    const paddedArgs = [Field(eventIndex), ...args];

    const eventHash = MinaEvents.eventHash(paddedArgs);
    this.self.body.events = {
      hash: eventHash,
      data: [paddedArgs],
    };
  }

  protected async enableTokenDepositsBase(
    tokenId: Field,
    bridgeContractAddress: PublicKey,
    // Witness it here, since o1js doesn't fetch this state correctly since
    // its updated in a parent AU
    settlementContractAddress: PublicKey
    // treeWitness: TokenBridgeTreeWitness
  ) {
    this.settlementContract.requireEquals(settlementContractAddress);
    const settlementContract =
      new DispatchSmartContractBase.args.settlementContractClass!(
        settlementContractAddress
      );

    // Append bridge address to the tree
    // TODO This not concurrent and will fail if multiple users deploy bridges at the same time
    const counter = this.tokenBridgeCount.getAndRequireEquals();
    const root = this.tokenBridgeRoot.getAndRequireEquals();

    const treeWitness = await Provable.witnessAsync(
      TokenBridgeTreeWitness,
      async () => {
        const tree = await TokenBridgeTree.buildTreeFromEvents(this);
        return tree.getWitness(counter.toBigInt());
      }
    );

    Provable.log(root);
    treeWitness
      .checkMembership(root, counter, Field(0))
      .assertTrue("Bridge Tree Witness not valid");

    const entry = new TokenBridgeEntry({
      tokenId,
      address: bridgeContractAddress,
    });
    const newRoot = treeWitness.calculateRoot(entry.hash());
    this.tokenBridgeRoot.set(newRoot);
    this.tokenBridgeCount.set(counter.add(1));

    this.emitEvent(
      "token-bridge-added",
      new TokenBridgeTreeAddition({
        index: counter,
        value: entry,
      })
    );

    // Authenticate call via callback
    settlementContract.authorizationField.requireEquals(
      new TokenBridgeDeploymentAuth({
        target: this.address,
        tokenId,
        address: bridgeContractAddress,
      }).hash()
    );

    this.approve(settlementContract.self);
  }
}

export class DispatchSmartContract
  extends DispatchSmartContractBase
  implements DispatchContractType
{
  @state(Field) public promisedMessagesHash = State<Field>();

  @state(Field) public honoredMessagesHash = State<Field>();

  @state(PublicKey) public settlementContract = State<PublicKey>();

  @state(Field) public tokenBridgeRoot = State<Field>(tokenBridgeRoot);

  @state(Field) public tokenBridgeCount = State<Field>();

  @method
  public async enableTokenDeposits(
    tokenId: Field,
    bridgeContractAddress: PublicKey,
    settlementContractAddress: PublicKey
  ) {
    await this.enableTokenDepositsBase(
      tokenId,
      bridgeContractAddress,
      settlementContractAddress
    );
  }

  @method
  public async updateMessagesHash(
    executedMessagesHash: Field,
    newPromisedMessagesHash: Field
  ) {
    return this.updateMessagesHashBase(
      executedMessagesHash,
      newPromisedMessagesHash
    );
  }

  @method
  public async initialize(settlementContract: PublicKey) {
    return this.initializeBase(settlementContract);
  }

  @method
  public async deposit(
    amount: UInt64,
    tokenId: Field,
    bridgingContract: PublicKey,
    bridgingContractAttestation: TokenBridgeAttestation,
    l2Receiver: PublicKey
  ) {
    const childrenMayUseToken: AccountUpdate["body"]["mayUseToken"] = {
      parentsOwnToken: Bool(false),
      // MayUseToken has to be set only for custom tokens
      inheritFromParent: tokenId.equals(TokenId.default).not(),
    };

    // Check that the bridgingContract parameter is valid => is in the offchain tree
    const bridgeTreeRoot = this.tokenBridgeRoot.getAndRequireEquals();
    const entry = new TokenBridgeEntry({
      tokenId,
      address: bridgingContract,
    });

    bridgingContractAttestation.witness
      .checkMembership(
        bridgeTreeRoot,
        bridgingContractAttestation.index,
        entry.hash()
      )
      .assertTrue("Bridging Contract Attestation not valid");

    // Credit the amount to the settlement contract
    const balanceAU = AccountUpdate.create(bridgingContract, tokenId);
    balanceAU.balance.addInPlace(amount);
    balanceAU.body.mayUseToken = childrenMayUseToken;
    this.approve(balanceAU);

    const action = new Deposit({
      tokenId,
      address: l2Receiver,
      amount,
    });

    const { methodIdMappings, incomingMessagesPaths } =
      DispatchSmartContractBase.args;

    const methodId = Field(
      methodIdMappings[incomingMessagesPaths.deposit].methodId
    ).toConstant();
    this.dispatchMessage(methodId.toConstant(), action, Deposit);

    this.self.body.mayUseToken = {
      parentsOwnToken: tokenId.equals(TokenId.default).not(),
      inheritFromParent: Bool(false),
    };
  }
}
