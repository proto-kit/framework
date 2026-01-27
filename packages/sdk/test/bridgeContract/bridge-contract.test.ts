import "reflect-metadata";
import {
  BridgeContract,
  BridgeContractArgs,
  BridgeContractContext,
  BridgingSettlementContractType,
  ContractArgsRegistry,
  createMessageStruct,
  OutgoingMessageArgument,
  OutgoingMessageArgumentBatch,
  OutgoingMessageKey,
  Path,
  PROTOKIT_FIELD_PREFIXES,
} from "@proto-kit/protocol";
import {
  AccountUpdate,
  Mina,
  PrivateKey,
  SmartContract,
  state,
  State,
  Permissions,
  TokenId,
  Field,
  UInt64,
  Poseidon,
  Provable,
  method,
} from "o1js";
import { container } from "tsyringe";
import { Withdrawal, WithdrawalMessageProcessor } from "@proto-kit/library";
import {
  InMemoryLinkedLeafStore,
  InMemoryMerkleTreeStorage,
  LinkedMerkleTree,
  noop,
} from "@proto-kit/common";

class MockSettlementContract
  extends SmartContract
  implements Pick<BridgingSettlementContractType, "assertStateRoot">
{
  @state(Field) root = State<Field>(Field(100));

  public assertStateRoot(root: Field): AccountUpdate {
    return this.self;
  }

  @method
  public async test() {
    noop();
  }
}

const proofsEnabled = false;

describe("bridging contract", () => {
  it("setup", async () => {
    container
      .resolve(ContractArgsRegistry)
      .addArgs<BridgeContractArgs>("BridgeContract", {
        SettlementContract: MockSettlementContract,
        messageProcessors: [new WithdrawalMessageProcessor() as any],
      });

    const key1 = PrivateKey.random();
    const key2 = PrivateKey.random();

    const chain = await Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(chain);

    const vkSettlement = await MockSettlementContract.compile();
    const vk = await BridgeContract.compile();

    const settlement = new MockSettlementContract(key1.toPublicKey());
    const contract = new BridgeContract(key2.toPublicKey());

    const tx = await Mina.transaction(chain.testAccounts[0], async () => {
      AccountUpdate.fundNewAccount(chain.testAccounts[0], 2);

      await settlement.deploy(vkSettlement);

      const accountUpdate = await contract.deployProvable(
        vk.verificationKey,
        false,
        Permissions.default(),
        key1.toPublicKey()
      );
      accountUpdate.requireSignature();
      AccountUpdate.attachToTransaction(accountUpdate);

      AccountUpdate.createSigned(chain.testAccounts[0]).send({
        to: key1.toPublicKey(),
        amount: 1e9,
      });
    });

    const proven = await tx
      .sign([chain.testAccounts[0].key, key1, key2])
      .prove();
    const txId = await proven.send();
    await txId.wait();

    const tree = new LinkedMerkleTree(
      new InMemoryMerkleTreeStorage(),
      new InMemoryLinkedLeafStore()
    );
    const path = Path.fromKey(
      PROTOKIT_FIELD_PREFIXES.OUTGOING_MESSAGE_BASE_PATH,
      OutgoingMessageKey,
      {
        index: Field(0),
        tokenId: contract.tokenId,
      }
    );
    const message = new Withdrawal({
      tokenId: TokenId.default,
      amount: UInt64.from(1e9),
      address: chain.testAccounts[1].key.toPublicKey(),
    });
    const MessageType = createMessageStruct(Withdrawal);
    tree.setLeaf(
      path.toBigInt(),
      Poseidon.hash(
        MessageType.toFields({ messageType: Field(0), value: message })
      ).toBigInt()
    );
    Provable.log(
      "tree hash",
      Poseidon.hash(
        MessageType.toFields({ messageType: Field(0), value: message })
      ).toBigInt()
    );

    const tx2 = await Mina.transaction(chain.testAccounts[0], async () => {
      await contract.updateStateRoot(tree.getRoot());
    });
    const proven2 = await tx2
      .sign([chain.testAccounts[0].key, key1, key2])
      .prove();
    const txId2 = await proven2.send();
    await txId2.wait();

    container.resolve(BridgeContractContext).data = {
      messageInputs: [[message]],
    };

    const treeWitness = tree.getReadWitness(path.toBigInt());

    const tx3 = await Mina.transaction(chain.testAccounts[0], async () => {
      const funded = await contract.rollupOutgoingMessages(
        OutgoingMessageArgumentBatch.fromMessages([
          new OutgoingMessageArgument({
            messageType: Field(0),
            witness: treeWitness,
          }),
        ])
      );

      let numNewAccountsNumber = 0;
      Provable.asProver(() => {
        numNewAccountsNumber = parseInt(funded.toString(), 10);
      });

      // Pay account creation fees for internal token accounts
      AccountUpdate.fundNewAccount(chain.testAccounts[0], numNewAccountsNumber);
    });
    const proven3 = await tx3
      .sign([chain.testAccounts[0].key, key1, key2])
      .prove();
    const txId3 = await proven3.send();
    await txId3.wait();

    console.log(proven3.proofs.map((p) => p?.toJSON()));
  }, 300000);
});
