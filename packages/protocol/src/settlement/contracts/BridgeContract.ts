import {
  AccountUpdate,
  Bool,
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

import {
  OUTGOING_MESSAGE_BATCH_SIZE,
  OutgoingMessageArgumentBatch,
} from "../messages/OutgoingMessageArgument";
import { Path } from "../../model/Path";
import { Withdrawal } from "../messages/Withdrawal";

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

export abstract class BridgeContractBase extends TokenContractV2 {
  public static args: {
    SettlementContract:
      | (TypedClass<SettlementContractType> & typeof SmartContract)
      | undefined;
    withdrawalStatePath: [string, string];
  };

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

  public async rollupOutgoingMessagesBase(
    batch: OutgoingMessageArgumentBatch
  ): Promise<Field> {
    let counter = this.outgoingMessageCursor.getAndRequireEquals();
    const stateRoot = this.stateRoot.getAndRequireEquals();

    const [withdrawalModule, withdrawalStateName] =
      BridgeContractBase.args.withdrawalStatePath;
    const mapPath = Path.fromProperty(withdrawalModule, withdrawalStateName);

    // Count account creation fee to return later, so that the sender can fund
    // those accounts with a separate AU
    let accountCreationFeePaid = Field(0);

    for (let i = 0; i < OUTGOING_MESSAGE_BATCH_SIZE; i++) {
      const args = batch.arguments[i];

      // Check witness
      const path = Path.fromKey(mapPath, OutgoingMessageKey, {
        index: counter,
        tokenId: this.tokenId,
      });

      // Process message
      const { address, amount } = args.value;
      const isDummy = address.equals(this.address);

      args.witness
        .checkMembership(
          stateRoot,
          path,
          Poseidon.hash(Withdrawal.toFields(args.value))
        )
        .or(isDummy)
        .assertTrue("Provided Withdrawal witness not valid");

      const tokenAu = this.internal.mint({ address, amount });
      const isNewAccount = tokenAu.account.isNew.getAndRequireEquals();

      accountCreationFeePaid = accountCreationFeePaid.add(
        Provable.if(isNewAccount, Field(1e9), Field(0))
      );

      counter = counter.add(Provable.if(isDummy, Field(0), Field(1)));
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
  public async rollupOutgoingMessages(
    batch: OutgoingMessageArgumentBatch
  ): Promise<Field> {
    return await this.rollupOutgoingMessagesBase(batch);
  }

  @method
  public async redeem(additionUpdate: AccountUpdate) {
    return await this.redeemBase(additionUpdate);
  }
}
