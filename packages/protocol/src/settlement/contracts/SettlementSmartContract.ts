import {
  prefixToField,
  RollupMerkleTree,
  TypedClass,
  mapSequential,
} from "@proto-kit/common";
import {
  AccountUpdate,
  Bool,
  Field,
  method,
  Mina,
  Poseidon,
  Proof,
  Provable,
  PublicKey,
  Signature,
  SmartContract,
  State,
  state,
  TokenId,
  UInt32,
  UInt64,
  TokenContract,
  AccountUpdateForest,
} from "o1js";

import { NetworkState } from "../../model/network/NetworkState";
import { Path } from "../../model/Path";
import { BlockHashMerkleTree } from "../../prover/block/accummulators/BlockHashMerkleTree";
import {
  BlockProverPublicInput,
  BlockProverPublicOutput,
} from "../../prover/block/BlockProvable";
import {
  OUTGOING_MESSAGE_BATCH_SIZE,
  OutgoingMessageArgumentBatch,
} from "../messages/OutgoingMessageArgument";
import { Withdrawal } from "../messages/Withdrawal";
import {
  ProvableSettlementHook,
  SettlementHookInputs,
  SettlementStateRecord,
} from "../modularity/ProvableSettlementHook";

import { DispatchContractType } from "./DispatchSmartContract";

/* eslint-disable @typescript-eslint/lines-between-class-members */

export class LazyBlockProof extends Proof<
  BlockProverPublicInput,
  BlockProverPublicOutput
> {
  public static publicInputType = BlockProverPublicInput;

  public static publicOutputType = BlockProverPublicOutput;

  public static tag: () => { name: string } = () => {
    throw new Error("Tag not initialized yet");
  };
}

export interface SettlementContractType {
  initialize: (
    sequencer: PublicKey,
    dispatchContract: PublicKey
  ) => Promise<void>;
  settle: (
    blockProof: LazyBlockProof,
    signature: Signature,
    dispatchContractAddress: PublicKey,
    publicKey: PublicKey,
    inputNetworkState: NetworkState,
    outputNetworkState: NetworkState,
    newPromisedMessagesHash: Field
  ) => Promise<void>;
  rollupOutgoingMessages: (
    batch: OutgoingMessageArgumentBatch
  ) => Promise<void>;
  redeem: (additionUpdate: AccountUpdate) => Promise<void>;
}

// Some random prefix for the sequencer signature
export const BATCH_SIGNATURE_PREFIX = prefixToField("pk-batchSignature");

export class SettlementSmartContract
  extends TokenContract
  implements SettlementContractType
{
  // This pattern of injecting args into a smartcontract is currently the only
  // viable solution that works given the inheritance issues of o1js
  public static args: {
    DispatchContract: TypedClass<DispatchContractType & SmartContract>;
    hooks: ProvableSettlementHook<unknown>[];
    withdrawalStatePath: [string, string];
    escapeHatchSlotsInterval: number;
  };

  @state(Field) public sequencerKey = State<Field>();
  @state(UInt32) public lastSettlementL1Block = State<UInt32>();

  @state(Field) public stateRoot = State<Field>();
  @state(Field) public networkStateHash = State<Field>();
  @state(Field) public blockHashRoot = State<Field>();

  @state(Field) public dispatchContractAddressX = State<Field>();

  @state(Field) public outgoingMessageCursor = State<Field>();

  @method async approveBase(forest: AccountUpdateForest) {
    this.checkZeroBalanceChange(forest);
  }

  @method
  public async initialize(sequencer: PublicKey, dispatchContract: PublicKey) {
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

    const { DispatchContract } = SettlementSmartContract.args;
    await new DispatchContract(dispatchContract).initialize(this.address);
  }

  @method
  public async settle(
    blockProof: LazyBlockProof,
    signature: Signature,
    dispatchContractAddress: PublicKey,
    publicKey: PublicKey,
    inputNetworkState: NetworkState,
    outputNetworkState: NetworkState,
    newPromisedMessagesHash: Field
  ) {
    // Verify the blockproof
    blockProof.verify();

    // Get and assert on-chain values
    const stateRoot = this.stateRoot.getAndRequireEquals();
    const networkStateHash = this.networkStateHash.getAndRequireEquals();
    const blockHashRoot = this.blockHashRoot.getAndRequireEquals();
    const sequencerKey = this.sequencerKey.getAndRequireEquals();
    const lastSettlementL1Block =
      this.lastSettlementL1Block.getAndRequireEquals();
    const onChainDispatchContractAddressX =
      this.dispatchContractAddressX.getAndRequireEquals();

    onChainDispatchContractAddressX.assertEquals(
      dispatchContractAddress.x,
      "DispatchContract address not provided correctly"
    );

    const { DispatchContract, escapeHatchSlotsInterval, hooks } =
      SettlementSmartContract.args;

    // Get dispatch contract values
    // These values are witnesses but will be checked later on the AU
    // call to the dispatch contract via .updateMessagesHash()
    const dispatchContract = new DispatchContract(dispatchContractAddress);
    const promisedMessagesHash = dispatchContract.promisedMessagesHash.get();

    // Get block height and use the lower bound for all ops
    const minBlockIncluded = this.network.globalSlotSinceGenesis.get();
    this.network.globalSlotSinceGenesis.requireBetween(
      minBlockIncluded,
      // 5 because that is the length the newPromisedMessagesHash will be valid
      minBlockIncluded.add(4)
    );

    // Check signature/escape catch
    publicKey.x.assertEquals(
      sequencerKey,
      "Sequencer public key witness not matching"
    );
    const signatureValid = signature.verify(publicKey, [
      BATCH_SIGNATURE_PREFIX,
      lastSettlementL1Block.value,
    ]);
    const escapeHatchActivated = lastSettlementL1Block
      .add(UInt32.from(escapeHatchSlotsInterval))
      .lessThan(minBlockIncluded);
    signatureValid
      .or(escapeHatchActivated)
      .assertTrue(
        "Sequencer signature not valid and escape hatch not activated"
      );

    // Assert correctness of networkState witness
    Provable.log("Network State Hash ", networkStateHash);
    Provable.log("input Hash ", inputNetworkState.hash());
    Provable.log("equals ", inputNetworkState.hash().equals(networkStateHash));

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
      lastSettlementL1Block,
      sequencerKey: publicKey,
    };
    const inputs: SettlementHookInputs = {
      blockProof,
      contractState: stateRecord,
      newPromisedMessagesHash,
      fromNetworkState: inputNetworkState,
      toNetworkState: outputNetworkState,
      currentL1Block: minBlockIncluded,
    };
    await mapSequential(hooks, async (hook) => {
      await hook.beforeSettlement(this, inputs);
    });

    // Apply blockProof
    stateRoot.assertEquals(
      blockProof.publicInput.stateRoot,
      "Input state root not matching"
    );
    Provable.log("Network State Hash ", networkStateHash);
    Provable.log("input Hash ", inputNetworkState.hash());
    Provable.log("Proof Hash ", blockProof.publicInput.networkStateHash);

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

    // Call DispatchContract
    // This call checks that the promisedMessagesHash, which is already proven
    // to be the blockProofs publicoutput, is actually the current on-chain
    // promisedMessageHash. It also checks the newPromisedMessagesHash to be
    // a current sequencestate value
    await dispatchContract.updateMessagesHash(
      promisedMessagesHash,
      newPromisedMessagesHash
    );

    this.lastSettlementL1Block.set(minBlockIncluded);
  }

  @method
  public async rollupOutgoingMessages(batch: OutgoingMessageArgumentBatch) {
    let counter = this.outgoingMessageCursor.getAndRequireEquals();
    const stateRoot = this.stateRoot.getAndRequireEquals();

    const [withdrawalModule, withdrawalStateName] =
      SettlementSmartContract.args.withdrawalStatePath;
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

    this.balance.subInPlace(UInt64.Unsafe.fromField(accountCreationFeePaid));

    this.outgoingMessageCursor.set(counter);
  }

  @method
  public async redeem(additionUpdate: AccountUpdate) {
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

/* eslint-enable @typescript-eslint/lines-between-class-members */
