import {
  AccountUpdate,
  DeployArgs,
  Field,
  method,
  Mina,
  Permissions,
  Poseidon,
  Provable,
  PublicKey,
  SmartContract,
  State,
  state,
  TokenContractV2,
  TokenId,
  UInt64,
} from "o1js";
import { noop, TypedClass } from "@proto-kit/common";

import {
  OUTGOING_MESSAGE_BATCH_SIZE,
  OutgoingMessageArgumentBatch,
} from "../messages/OutgoingMessageArgument";
import { Path } from "../../model/Path";
import { Withdrawal } from "../messages/Withdrawal";

import type { SettlementContractType } from "./SettlementSmartContract";

export type BridgeContractType = {
  rollupOutgoingMessages: (
    batch: OutgoingMessageArgumentBatch
  ) => Promise<void>;
  redeem: (additionUpdate: AccountUpdate) => Promise<void>;

  deployWithParentAddress: (
    args: DeployArgs,
    signedSettlement: boolean,
    permissions: Permissions,
    settlementContractAddress: PublicKey
  ) => Promise<void>;
};

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

  public async deployWithParentAddress(
    args: DeployArgs,
    signedSettlement: boolean,
    permissions: Permissions,
    settlementContractAddress: PublicKey
  ) {
    if (!signedSettlement) {
      await super.deploy(args);
    }
    this.account.permissions.set(permissions);

    this.settlementContractAddress.set(settlementContractAddress);
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

  public async rollupOutgoingMessagesBase(batch: OutgoingMessageArgumentBatch) {
    let counter = this.outgoingMessageCursor.getAndRequireEquals();
    const stateRoot = this.stateRoot.getAndRequireEquals();

    const [withdrawalModule, withdrawalStateName] =
      BridgeContractBase.args.withdrawalStatePath;
    const mapPath = Path.fromProperty(withdrawalModule, withdrawalStateName);

    let accountCreationFeePaid = Field(0);

    for (let i = 0; i < OUTGOING_MESSAGE_BATCH_SIZE; i++) {
      const args = batch.arguments[i];

      // Check witness
      const path = Path.fromKey(mapPath, Field, counter);

      args.witness
        .checkMembership(
          stateRoot,
          path,
          Poseidon.hash(Withdrawal.toFields(args.value))
        )
        .assertTrue("Provided Withdrawal witness not valid");

      // Process message
      const { address, amount } = args.value;
      const isDummy = address.equals(this.address);

      const tokenAu = this.internal.mint({ address, amount });
      const isNewAccount = tokenAu.account.isNew.getAndRequireEquals();
      tokenAu.body.balanceChange.magnitude =
        tokenAu.body.balanceChange.magnitude.sub(
          Provable.if(
            isNewAccount,
            Mina.getNetworkConstants().accountCreationFee.toConstant(),
            UInt64.zero
          )
        );

      accountCreationFeePaid = accountCreationFeePaid.add(
        Provable.if(isNewAccount, Field(1e9), Field(0))
      );

      counter = counter.add(Provable.if(isDummy, Field(0), Field(1)));
    }

    // TODO This only works for Mina tokens, not custom tokens
    this.balance.subInPlace(UInt64.Unsafe.fromField(accountCreationFeePaid));

    this.outgoingMessageCursor.set(counter);
  }

  protected async redeemBase(additionUpdate: AccountUpdate) {
    additionUpdate.body.tokenId.assertEquals(
      TokenId.default,
      "Tokenid not default token"
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

  @method
  public async rollupOutgoingMessages(batch: OutgoingMessageArgumentBatch) {
    return await this.rollupOutgoingMessagesBase(batch);
  }

  @method
  public async redeem(additionUpdate: AccountUpdate) {
    return await this.redeemBase(additionUpdate);
  }
}
