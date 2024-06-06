import {
  AccountUpdate,
  Field,
  method,
  Poseidon,
  ProvableExtended,
  PublicKey,
  Reducer,
  SmartContract,
  State,
  state,
  UInt64,
} from "o1js";

import { RuntimeMethodIdMapping } from "../../model/RuntimeLike";
import { RuntimeTransaction } from "../../model/transaction/RuntimeTransaction";
import {
  MinaActions,
  MinaEvents,
} from "../../utils/MinaPrefixedProvableHashList";
import { Deposit } from "../messages/Deposit";

export const ACTIONS_EMPTY_HASH = Reducer.initialActionState;

export interface DispatchContractType {
  updateMessagesHash: (
    executedMessagesHash: Field,
    newPromisedMessagesHash: Field
  ) => Promise<void>;
  initialize: (settlementContract: PublicKey) => Promise<void>;

  promisedMessagesHash: State<Field>;
}

export class DispatchSmartContract
  extends SmartContract
  implements DispatchContractType
{
  public static args: {
    methodIdMappings: RuntimeMethodIdMapping;
    incomingMessagesPaths: Record<string, `${string}.${string}`>;
  };

  @state(Field) public promisedMessagesHash = State<Field>();

  @state(Field) public honoredMessagesHash = State<Field>();

  @state(PublicKey) public settlementContract = State<PublicKey>();

  @method
  public async updateMessagesHash(
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
  }

  @method
  public async initialize(settlementContract: PublicKey) {
    this.promisedMessagesHash.getAndRequireEquals().assertEquals(Field(0));
    this.honoredMessagesHash.getAndRequireEquals().assertEquals(Field(0));
    this.settlementContract
      .getAndRequireEquals()
      .assertEquals(PublicKey.empty<typeof PublicKey>());

    this.promisedMessagesHash.set(ACTIONS_EMPTY_HASH);
    this.honoredMessagesHash.set(ACTIONS_EMPTY_HASH);
    this.settlementContract.set(settlementContract);
  }

  private dispatchMessage<Type>(
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

    const eventHash = MinaEvents.eventHash(args);
    this.self.body.events = {
      hash: eventHash,
      data: [args],
    };
  }

  @method
  public async deposit(amount: UInt64) {
    // Save this, since otherwise it would be a second witness later,
    // which could be a different values than the first
    const sender = this.sender.getUnconstrained();

    const settlementContract = this.settlementContract.getAndRequireEquals();

    // Credit the amount to the settlement contract
    const balanceAU = AccountUpdate.create(settlementContract);
    balanceAU.balance.addInPlace(amount);
    this.self.approve(balanceAU);

    const action = new Deposit({
      address: sender,
      amount,
    });

    const { methodIdMappings, incomingMessagesPaths } =
      DispatchSmartContract.args;

    const methodId = Field(
      methodIdMappings[incomingMessagesPaths.deposit].methodId
    ).toConstant();
    this.dispatchMessage(methodId.toConstant(), action, Deposit);
  }
}
