import {
  Field,
  method,
  Poseidon,
  ProvableExtended,
  PublicKey,
  SmartContract,
  State,
  state,
  UInt64,
} from "o1js";
import { RuntimeTransaction } from "../model/transaction/RuntimeTransaction";
import { MinaActions, MinaEvents } from "../utils/MinaPrefixedProvableHashList";
import { ACTIONS_EMPTY_HASH, Deposit } from "./SettlementContract";

export class DispatchContract extends SmartContract {
  @state(Field) public promisedMessagesHash = State<Field>();
  @state(Field) public honoredMessagesHash = State<Field>();

  public constructor(
    address: PublicKey,
    private readonly methodIdMappings: Record<string, bigint>,
    private readonly incomingMessagesPaths: Record<
      string,
      `${string}.${string}`
    >
  ) {
    super(address);
  }

  @method
  public updateMessagesHash(executedMessagesHash: Field, newPromisedMessagesHash: Field) {
    const promisedMessagesHash = this.promisedMessagesHash.getAndAssertEquals();
    this.honoredMessagesHash.getAndAssertEquals();

    executedMessagesHash.assertEquals(promisedMessagesHash);

    this.honoredMessagesHash.set(executedMessagesHash);

    // Assert and apply new promisedMessagesHash
    this.self.account.actionState.assertEquals(newPromisedMessagesHash);
    this.promisedMessagesHash.set(newPromisedMessagesHash);
  }

  @method
  public initialize() {
    this.promisedMessagesHash.getAndAssertEquals().assertEquals(Field(0));
    this.honoredMessagesHash.getAndAssertEquals().assertEquals(Field(0));

    this.promisedMessagesHash.set(ACTIONS_EMPTY_HASH);
    this.honoredMessagesHash.set(ACTIONS_EMPTY_HASH);
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
  public deposit(amount: UInt64) {
    // Save this, since otherwise it would be a second witness later,
    // which could be a different values than the first
    const sender = this.sender;

    // Credit the amount to the bridge contract
    this.self.balance.addInPlace(amount);

    const action = new Deposit({
      address: sender,
      amount,
    });
    const methodId = Field(
      this.methodIdMappings[this.incomingMessagesPaths["deposit"]]
    );
    this.dispatchMessage(methodId.toConstant(), action, Deposit);
  }
}
