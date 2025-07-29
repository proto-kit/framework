import {
  AccountUpdate,
  Bool,
  Experimental,
  Field,
  method,
  Permissions,
  Poseidon,
  Provable,
  PublicKey,
  SmartContract,
  State,
  state,
  Struct,
  TokenContractV2,
  TokenId,
  VerificationKey,
} from "o1js";
import { noop, range, TypedClass } from "@proto-kit/common";
import { container, injectable, singleton } from "tsyringe";

import {
  OUTGOING_MESSAGE_BATCH_SIZE,
  OutgoingMessageArgumentBatch,
  createMessageStruct,
  OutgoingMessageArgument,
} from "../messages/OutgoingMessageArgument";
import { Path } from "../../model/Path";
import { OutgoingMessageProcessor } from "../modularity/OutgoingMessageProcessor";
import { PROTOKIT_FIELD_PREFIXES } from "../../hashing/protokit-prefixes";

import type { SettlementContractType } from "./SettlementSmartContract";

export type BridgeContractType = {
  stateRoot: State<Field>;
  outgoingMessageCursor: State<Field>;

  rollupOutgoingMessages: (
    batch: OutgoingMessageArgumentBatch
  ) => Promise<Field>;
  redeem: (additionUpdate: AccountUpdate) => Promise<void>;

  deployProvable: (
    args: VerificationKey | undefined,
    signedSettlement: boolean,
    permissions: Permissions,
    settlementContractAddress: PublicKey
  ) => Promise<AccountUpdate>;

  updateStateRoot: (root: Field) => Promise<void>;
};

// Equal to WithdrawalKey
export class OutgoingMessageKey extends Struct({
  index: Field,
  tokenId: Field,
}) {}

@injectable()
@singleton()
export class BridgeContractContext {
  public data: {
    messageInputs: any[][];
  } = { messageInputs: [] };
}

export abstract class BridgeContractBase extends TokenContractV2 {
  public static args: {
    SettlementContract:
      | (TypedClass<SettlementContractType> & typeof SmartContract)
      | undefined;
    messageProcessors: OutgoingMessageProcessor<unknown>[];
    batchSize?: number;
  };

  public constructor(address: PublicKey, tokenId?: Field) {
    super(address, tokenId);
  }

  abstract settlementContractAddress: State<PublicKey>;

  abstract stateRoot: State<Field>;

  abstract outgoingMessageCursor: State<Field>;

  /**
   * Function to deploy the bridging contract in a provable way, so that it can be
   * a provable process initiated by the settlement contract with a baked-in vk
   *
   * @returns Creates and returns an account update deploying the bridge contract
   */
  public async deployProvable(
    verificationKey: VerificationKey | undefined,
    signedSettlement: boolean,
    permissions: Permissions,
    settlementContractAddress: PublicKey
  ) {
    const accountUpdate = this.self;

    if (!signedSettlement) {
      if (verificationKey === undefined) {
        throw new Error("Verification Key not provided, can't deploy");
      }
      accountUpdate.account.verificationKey.set(verificationKey);
    }

    accountUpdate.requireSignature();
    this.account.permissions.set(permissions);

    range(0, 8).forEach((i) => {
      accountUpdate.update.appState[i] = {
        isSome: Bool(true),
        value: Field(0),
      };
    });

    this.settlementContractAddress.set(settlementContractAddress);

    accountUpdate.body.mayUseToken = {
      // Set to true for custom tokens only
      inheritFromParent: accountUpdate.tokenId.equals(TokenId.default).not(),
      parentsOwnToken: Bool(false),
    };

    return accountUpdate;
  }

  public async approveBase(): Promise<void> {
    noop();
  }

  public async updateStateRootBase(root: Field) {
    // It's fine for us to only store the actual root since we only have to
    // witness values, not update/insert
    this.stateRoot.set(root);

    const settlementContractAddress =
      this.settlementContractAddress.getAndRequireEquals();
    const SettlementContractClass = BridgeContractBase.args.SettlementContract;
    if (SettlementContractClass === undefined) {
      throw new Error(
        "Settlement Contract class hasn't been set yet, something is wrong with your module composition"
      );
    }
    const settlementContract = new SettlementContractClass(
      settlementContractAddress
    );
    const accountUpdate = settlementContract.assertStateRoot(root);
    this.approve(accountUpdate);
  }

  private batchSize() {
    return BridgeContractBase.args.batchSize ?? OUTGOING_MESSAGE_BATCH_SIZE;
  }

  private executeProcessors(batchIndex: number, args: OutgoingMessageArgument) {
    return BridgeContractBase.args.messageProcessors.map((processor, j) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const value = Experimental.memoizeWitness(processor.type, () => {
        return container.resolve(BridgeContractContext).data.messageInputs[
          batchIndex
        ][j];
      });

      const MessageType = createMessageStruct(processor.type);
      const message = new MessageType({
        messageType: args.messageType,
        value,
      });
      return {
        messageType: args.messageType,
        result: processor.processMessage(value, {
          bridgeContract: {
            publicKey: this.address,
            tokenId: this.tokenId,
          },
        }),
        hash: Poseidon.hash(MessageType.toFields(message)),
      };
    });
  }

  public processMessage(
    batchIndex: number,
    args: OutgoingMessageArgument,
    isDummy: Bool
  ) {
    const results = this.executeProcessors(batchIndex, args);

    const maxAccountUpdates = Math.max(
      0,
      ...results.map(({ result: { accountUpdates } }) => accountUpdates.length)
    );
    const AccountUpdateArray = Provable.Array(AccountUpdate, maxAccountUpdates);

    const dummyMessageType =
      PROTOKIT_FIELD_PREFIXES.OUTGOING_MESSAGE_DUMMY_TYPE;
    const argMessageType = Provable.if(
      isDummy,
      dummyMessageType,
      args.messageType
    );
    const dummyAU = AccountUpdate.dummy();

    const chosen = results
      .map((a) => {
        a.result.accountUpdates = a.result.accountUpdates.concat(
          ...Array<AccountUpdate>(
            maxAccountUpdates - a.result.accountUpdates.length
          ).fill(dummyAU)
        );
        return a;
      })
      .concat({
        messageType: dummyMessageType,
        hash: Field(0),
        result: {
          accountUpdates: Array<AccountUpdate>(maxAccountUpdates).fill(dummyAU),
          status: Bool(true),
          statusMessage: undefined,
        },
      })
      .reduce((a, b) => {
        const isA = a.messageType.equals(argMessageType);

        const messageType = Provable.if(isA, a.messageType, b.messageType);
        const hash = Provable.if(isA, a.hash, b.hash);
        const accountUpdates = Provable.if(
          isA,
          AccountUpdateArray,
          a.result.accountUpdates,
          b.result.accountUpdates
        );
        const status = Provable.if(isA, a.result.status, b.result.status);
        let statusMessage: string | undefined = undefined;
        Provable.asProver(() => {
          if (isA.toBoolean()) {
            statusMessage = a.result.statusMessage;
          } else {
            statusMessage = b.result.statusMessage;
          }
        });

        return {
          messageType,
          hash,
          result: { accountUpdates, status, statusMessage },
        };
      });

    // If no processor picks up our message type, the reduce above returns
    // the first candidate. This statement asserts that this is not the case
    chosen.messageType.assertEquals(
      argMessageType,
      "No processor found for message type"
    );

    return chosen;
  }

  public async rollupOutgoingMessagesBase(batch: OutgoingMessageArgumentBatch) {
    let counter = this.outgoingMessageCursor.getAndRequireEquals();
    const stateRoot = this.stateRoot.getAndRequireEquals();

    // Count account creation fee to return later, so that the sender can fund
    // those accounts with a separate AU
    let accountCreationFeePaid = Field(0);

    for (let i = 0; i < this.batchSize(); i++) {
      const args = batch.arguments[i];

      const isDummy = batch.isDummys[i];

      const message = this.processMessage(i, args, isDummy);

      // Check witness
      const path = Path.fromKey(
        PROTOKIT_FIELD_PREFIXES.OUTGOING_MESSAGE_BASE_PATH,
        OutgoingMessageKey,
        {
          index: counter,
          tokenId: this.tokenId,
        }
      );

      args.witness
        .checkMembership(stateRoot, path, message.hash)
        .or(isDummy)
        .assertTrue("Provided Withdrawal witness not valid");

      message.result.status.assertTrue(message.result.statusMessage);

      message.result.accountUpdates.forEach((accountUpdate) => {
        Provable.log("Approving account update", accountUpdate.label);
        this.approve(accountUpdate);
      });
      counter = counter.add(Provable.if(isDummy, Field(0), Field(1)));

      // Track new accounts to be able to know how much new accounts to fund
      const newAccounts = message.result.accountUpdates
        .map((accountUpdate) => {
          const isNew = accountUpdate.account.isNew.getAndRequireEquals();
          return Provable.if(isNew, Field(1), Field(0));
        })
        .reduce((a, b) => a.add(b));
      accountCreationFeePaid = accountCreationFeePaid.add(newAccounts);
    }

    this.outgoingMessageCursor.set(counter);

    return accountCreationFeePaid;
  }

  protected async redeemBase(additionUpdate: AccountUpdate) {
    additionUpdate.body.tokenId.assertEquals(
      this.tokenId,
      "Tokenid not same as this bridging contract's tokenId"
    );
    additionUpdate.body.balanceChange.sgn
      .isPositive()
      .assertTrue("Sign not correct");
    const amount = additionUpdate.body.balanceChange.magnitude;

    // Burn tokens
    this.internal.burn({
      address: additionUpdate.publicKey,
      amount,
    });

    // Inherit from parent for custom tokens
    additionUpdate.body.mayUseToken = {
      inheritFromParent: this.tokenId.equals(TokenId.default).not(),
      parentsOwnToken: Bool(false),
    };

    // Send mina
    this.approve(additionUpdate);
    this.balance.subInPlace(amount);
  }
}

export class BridgeContract
  extends BridgeContractBase
  implements BridgeContractType
{
  @state(PublicKey) public settlementContractAddress = State<PublicKey>();

  @state(Field) public stateRoot = State<Field>();

  @state(Field) public outgoingMessageCursor = State<Field>();

  @method
  public async updateStateRoot(root: Field) {
    return await this.updateStateRootBase(root);
  }

  @method.returns(Field)
  public async rollupOutgoingMessages(batch: OutgoingMessageArgumentBatch) {
    return await this.rollupOutgoingMessagesBase(batch);
  }

  @method
  public async redeem(additionUpdate: AccountUpdate) {
    return await this.redeemBase(additionUpdate);
  }
}
