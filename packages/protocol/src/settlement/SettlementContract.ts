import {
  AccountUpdate,
  Bool,
  Field,
  method,
  Poseidon,
  Proof,
  Provable,
  ProvableExtended,
  PublicKey,
  Reducer,
  Signature,
  SmartContract,
  State,
  state,
  Struct,
  TokenId,
  UInt32,
  UInt64,
} from "o1js";
import { ProtocolModule } from "../protocol/ProtocolModule";
import { inject, injectable } from "tsyringe";
import { BlockProver } from "../prover/block/BlockProver";
import {
  BlockProvable,
  BlockProverPublicInput,
  BlockProverPublicOutput,
} from "../prover/block/BlockProvable";
import { NetworkState } from "../model/network/NetworkState";
import {
  filterNonUndefined,
  RollupMerkleTree,
  RollupMerkleTreeWitness,
} from "@proto-kit/common";
import { BlockHashMerkleTree } from "../prover/block/accummulators/BlockHashMerkleTree";
import { RuntimeTransaction } from "../model/transaction/RuntimeTransaction";
import { Path } from "../model/Path";
import { Actions, Events } from "o1js/dist/node/lib/account_update";

class LazyBlockProof extends Proof<
  BlockProverPublicInput,
  BlockProverPublicOutput
> {
  public static publicInputType = BlockProverPublicInput;

  public static publicOutputType = BlockProverPublicOutput;

  public static tag: () => { name: string } = () => {
    throw new Error("Tag not initialized yet");
  };
}

export type SettlementMethodIdMapping = Record<`${string}.${string}`, bigint>;

export class Deposit extends Struct({
  address: PublicKey,
  amount: UInt64,
}) {}

export class Withdrawal extends Struct({
  address: PublicKey,
  amount: UInt64,
}) {}

export const OUTGOING_MESSAGE_BATCH_SIZE = 1;

export class OutgoingMessageArgument extends Struct({
  witness: RollupMerkleTreeWitness,
  value: Withdrawal,
}) {}

export class OutgoingMessageArgumentBatch extends Struct({
  arguments: Provable.Array(
    OutgoingMessageArgument,
    OUTGOING_MESSAGE_BATCH_SIZE
  ),
}) {}

// Some random prefix for the sequencer signature
export const BATCH_SIGNATURE_PREFIX = Poseidon.hash([Field(87686586)]);

export const ACTIONS_EMPTY_HASH = Reducer.initialActionState;

export class SettlementContract extends SmartContract {
  @state(Field) public sequencerKey = State<Field>();
  @state(UInt32) public lastSettlementL1Block = State<UInt32>();

  @state(Field) public stateRoot = State<Field>();
  @state(Field) public networkStateHash = State<Field>();
  @state(Field) public blockHashRoot = State<Field>();

  @state(Field) public promisedMessagesHash = State<Field>();
  @state(Field) public honoredMessagesHash = State<Field>();

  @state(Field) public outgoingMessageCursor = State<Field>();

  public constructor(
    address: PublicKey,
    private readonly methodIdMappings: Record<string, bigint>,
    private readonly escapeHatchSlotsInterval = (60 / 3) * 24 // 24 hours // private hooks: ProvableSettlementHook<unknown>[]
  ) {
    super(address);
  }

  @method
  public initialize(sequencer: PublicKey) {
    this.sequencerKey.getAndAssertEquals().assertEquals(Field(0));
    this.stateRoot.getAndAssertEquals().assertEquals(Field(0));
    this.blockHashRoot.getAndAssertEquals().assertEquals(Field(0));
    this.networkStateHash.getAndAssertEquals().assertEquals(Field(0));
    this.promisedMessagesHash.getAndAssertEquals().assertEquals(Field(0));
    this.honoredMessagesHash.getAndAssertEquals().assertEquals(Field(0));

    this.sequencerKey.set(sequencer.x);
    this.stateRoot.set(Field(RollupMerkleTree.EMPTY_ROOT));
    this.blockHashRoot.set(Field(BlockHashMerkleTree.EMPTY_ROOT));
    this.networkStateHash.set(NetworkState.empty().hash());
    this.promisedMessagesHash.set(ACTIONS_EMPTY_HASH);
    this.honoredMessagesHash.set(ACTIONS_EMPTY_HASH);
  }

  @method
  public settle(
    blockProof: LazyBlockProof,
    signature: Signature,
    publicKey: PublicKey,
    inputNetworkState: NetworkState,
    outputNetworkState: NetworkState,
    newPromisedMessagesHash: Field
  ) {
    // Verify the blockproof
    blockProof.verify();

    // Get and assert on-chain values
    const stateRoot = this.stateRoot.getAndAssertEquals();
    const networkStateHash = this.networkStateHash.getAndAssertEquals();
    const blockHashRoot = this.blockHashRoot.getAndAssertEquals();
    const sequencerKey = this.sequencerKey.getAndAssertEquals();
    const promisedMessagesHash = this.promisedMessagesHash.getAndAssertEquals();
    const honoredMessagesHash = this.honoredMessagesHash.getAndAssertEquals();
    const lastSettlementL1Block =
      this.lastSettlementL1Block.getAndAssertEquals();

    // Get block height and use the lower bound for all ops
    const minBlockIncluded = this.network.globalSlotSinceGenesis.get();
    this.network.globalSlotSinceGenesis.assertBetween(
      minBlockIncluded,
      minBlockIncluded.add(20)
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
      .add(UInt32.from(this.escapeHatchSlotsInterval))
      .lessThan(minBlockIncluded);
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
    // TODO Enable when we figured out the actionHash construction
    promisedMessagesHash.assertEquals(
      blockProof.publicOutput.incomingMessagesHash,
      "Promised messages not honored"
    );
    this.honoredMessagesHash.set(promisedMessagesHash);

    // Assert and apply new promisedMessagesHash
    // Enable when starting point is Actions.emptyActionState()
    // this.self.account.actionState.assertEquals(newPromisedMessagesHash);
    this.promisedMessagesHash.set(newPromisedMessagesHash);

    this.lastSettlementL1Block.set(minBlockIncluded);
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
    const transactionFields = runtimeTransaction.hashData();
    // console.log(Poseidon.hash([...transactionFields.slice(0, -1), ...fields]))

    // const data = Runt

    // this.self.body.actions = {
    //   hash: runtimeTransaction.hash(),
    //   data: [[...transactionFields.slice(0, -1), ...fields]],
    // };

    Provable.log(Poseidon.hash(transactionFields));
    Provable.log("TF", transactionFields);
    Provable.log("args", args);

    // TODO Replace
    this.self.body.actions = Actions.pushEvent(
      this.self.body.actions,
      transactionFields
    );
    this.self.body.events = Events.pushEvent(this.self.body.events, args);

    // {
    // hash: Poseidon.hash(transactionFields),
    // data: [transactionFields, args],
    // };
  }

  @method
  public deposit(amount: UInt64) {
    // Save this, since otherwise it would be a second witness later,
    // which could be a different values than the first
    const sender = this.sender;
    // Create AccountUpdate that deducts the amount from the sender
    const source = AccountUpdate.create(sender);
    source.balance.subInPlace(amount);
    source.requireSignature();

    // Credit the amount to the bridge contract
    this.self.balance.addInPlace(amount);

    const action = new Deposit({
      address: sender,
      amount,
    });
    const methodId = Field(this.methodIdMappings["Balances.deposit"]);
    this.dispatchMessage(methodId.toConstant(), action, Deposit);
  }

  @method
  public rollupOutgoingMessages(batch: OutgoingMessageArgumentBatch) {
    let counter = this.outgoingMessageCursor.getAndAssertEquals();
    const stateRoot = this.stateRoot.getAndAssertEquals();

    const mapPath = Path.fromProperty("Withdrawals", "withdrawals");

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

      const tokenAu = this.token.mint({ address, amount });
      const isNewAccount = tokenAu.account.isNew.getAndAssertEquals();
      tokenAu.body.balanceChange.magnitude =
        tokenAu.body.balanceChange.magnitude.sub(
          Provable.if(isNewAccount, UInt64.from(1e9), UInt64.zero)
        );

      accountCreationFeePaid = accountCreationFeePaid.add(
        Provable.if(isNewAccount, Field(1e9), Field(0))
      );

      counter = counter.add(Provable.if(isDummy, Field(0), Field(1)));
    }

    this.balance.subInPlace(UInt64.from(accountCreationFeePaid));

    this.outgoingMessageCursor.set(counter);
  }

  @method
  public redeem(additionUpdate: AccountUpdate) {
    additionUpdate.body.tokenId.assertEquals(
      TokenId.default,
      "Tokenid not default token"
    );
    additionUpdate.body.balanceChange.sgn
      .isPositive()
      .assertTrue("Sign not correct");
    const amount = additionUpdate.body.balanceChange.magnitude;

    // Burn tokens
    this.token.burn({
      address: additionUpdate.publicKey,
      amount,
    });

    // Send mina
    this.approve(additionUpdate);
    this.balance.subInPlace(amount);
  }
}

export class SettlementTokenOwnerContract extends SmartContract {}

@injectable()
export class SettlementContractModule extends ProtocolModule {
  public constructor(
    // @injectAll("ProvableSettlementHook")
    // private readonly hooks: ProvableSettlementHook<unknown>[],
    @inject("BlockProver")
    private readonly blockProver: BlockProvable
  ) {
    super();
    LazyBlockProof.tag = blockProver.zkProgrammable.zkProgram.Proof.tag;
  }

  public getContractClass(): typeof SettlementContract {
    return SettlementContract;
  }

  public createContract(
    address: PublicKey,
    methodIdMappings: SettlementMethodIdMapping
  ): SettlementContract {
    return new SettlementContract(address, methodIdMappings);
  }
}
